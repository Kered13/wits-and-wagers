import { Subject, type Observable } from "rxjs";

import { type Phase } from "./phase.js";
import { Participant, Player, Spectator } from "../player/player.js";
import { type PlayerManager } from "../player/player-manager.js";
import { HttpError } from "../utils/httperror.js";
import { type Bet, type BetTarget, type BettingPhaseState, type Guess as GuessJson, type GuessTarget } from "../../shared/game/betting-phase.js";
import { type PrivateId, type PublicId } from "../../shared/player.js";
import { type BettingConclusion, type BettingResults } from "../../shared/game/intermission-phase.js";
import { stripAnswer, type QuestionAnswerInfo } from "../../shared/game/question.js";


// Indicates whether each guess is Red or Black, by number of players in
// the game.
const N = Symbol("None");
const R = Symbol("Red");
const B = Symbol("Black");


export type BettingPhaseOptions = {
	// In milliseconds.
	bettingPhaseDuration?: number;
};


export const DEFAULT_BETTING_PHASE_OPTIONS: BettingPhaseOptions = {
	bettingPhaseDuration: undefined
};


type Guess = {
	player: PublicId;
	guess: number;
};


function sortGuesses<T extends Participant>(guesses: Map<T, number>): Guess[] {
	return Array.from(guesses)
		.sort((first, second) => first[1] - second[1])
		.map(([player, guess]) => ({ player: player.publicId, guess: guess }));
}

function toGuessJson(guesses: Guess[]): GuessJson[] {
	return guesses
		.map(({ player, guess }, i): GuessJson => {
			const target = guessToTarget(guesses.length, i);
			return {
				player: player,
				target: target,
				guess: guess,
			};
		});
}


function guessToTarget(numPlayers: number, guessIdx: number): GuessTarget {
	const targetMap: GuessTarget[][] = [
		[],
		[3],
		[2, 4],
		[2, 3, 4],
		[1, 2, 4, 5],
		[1, 2, 3, 4, 5],
		[0, 1, 2, 4, 5, 6],
		[0, 1, 2, 3, 4, 5, 6],
	];
	return targetMap[numPlayers]![guessIdx]!;
}


function payoutForTarget(target: BetTarget): number {
	// Payouts for each target.
	const payoutMultipliers = [5, 4, 3, 2, 3, 4, 5];
	if (target === "AllTooHigh") {
		return 6;
	} else if (target === "Red" || target === "Black") {
		return 1;
	} else {
		return payoutMultipliers[target]!;
	}
}


// Returns the number of reserved chips a player should get for each of
// their losing bets.
function reservedChipsFor(bet: Bet, bets: Bet[]): number {
	const numBets = bets.filter(bet2 => bet2.player === bet.player).length;

	// A player who made no bets gets no reserved chips back. A player who
	// made one bet gets up to two chips back. A player who made two bets
	// gets one chip back for each bet. But a player can never get back more
	// than they wagered.
	return Math.min(bet.wager, [0, 2, 1][numBets]!);
}


export class BettingPhase implements Phase {
	private readonly bets: Bet[] = [];
	private readonly spectatorBets: Bet[] = [];
	private readonly guesses: GuessJson[];
	private readonly specGuesses: Guess[];
	private readonly endPhaseSubj = new Subject<void>();
	private readonly timeout: NodeJS.Timeout | undefined;
	// Phase end time as millisecond timestamp.
	private readonly endTime: number | undefined;
	
	constructor(
			private readonly questionInfo: QuestionAnswerInfo,
			private readonly playerManager: PlayerManager,
			guesses: Map<Player, number>,
			specGuesses: Map<Spectator, number>,
			private readonly round: number,
			private readonly options: BettingPhaseOptions) {
		this.guesses = toGuessJson(sortGuesses(guesses));
		this.specGuesses = sortGuesses(specGuesses);
		
		if (options.bettingPhaseDuration) {
			// Add a small fudge factor to the round duration. This is just to
			// give players some leniency and account for latency.
			const phaseDuration = options.bettingPhaseDuration + 300;
			this.timeout = setTimeout(() => this.endPhase(), phaseDuration);
			this.endTime = new Date().getTime() + phaseDuration;
		}
	}
	
	private targetToGuess(target: GuessTarget): GuessJson | undefined {
		const U = undefined;
		const guessMap = [
			[U, U, U, U, U, U, U],
			[U, U, U, 0, U, U, U],
			[U, U, 0, U, 1, U, U],
			[U, U, 0, 1, 2, U, U],
			[U, 0, 1, U, 2, 3, U],
			[U, 0, 1, 2, 3, 4, U],
			[0, 1, 2, U, 3, 4, 5],
			[0, 1, 2, 3, 4, 5, 6],
		];
		
		const guessIdx = guessMap[this.guesses.length]![target];
		if (guessIdx === undefined) {
			return undefined;
		}
		return this.guesses[guessIdx];
	}
	
	public submitBet(playerId: PrivateId, target: BetTarget, wager: number): void {
		this.validateTarget(target);
		
		const player = this.playerManager.getPrivateParticipant(playerId);
		if (player instanceof Player) {
			this.doSubmitBet(player, this.bets, target, wager);
		} else {
			this.doSubmitBet(player, this.spectatorBets, target, wager);
		}
	}
	
	private doSubmitBet(player: Participant, bets: Bet[], target: BetTarget, wager: number): void {
		const existingBetIdx = bets.findIndex(bet => bet.player === player.publicId && bet.target === target);
		const existingBet = existingBetIdx >= 0 ? bets[existingBetIdx]! : undefined;
		this.validateWager(player, bets, wager, existingBet);
		
		if (existingBet) {
			// Remove the previous bet.
			player.chips += existingBet.wager;
			bets.splice(existingBetIdx, 1);
		}
		
		if (wager > 0) {
			bets.push({ player: player.publicId, target: target, wager: wager });
			// Deduct the wager from the player's chips.
			player.chips -= wager;
		}
	}
	
	// Finds the winning guess and computes payouts based on bets. Returns a
	// summary of the results of the round.
	public resolve(): BettingConclusion {
		const conclusion: BettingConclusion = {
			type: "conclusion",
			players: {
				winners: [],
				earnings: Object.fromEntries(this.playerManager.getAllPlayers().map(player => [player.publicId, 0])),
			},
			spectators: {
				winners: [],
				earnings: Object.fromEntries(this.playerManager.getAllSpectators().map(spectator => [spectator.publicId, 0]))
			},
		};
		
		let winningGuessIdx = -1;
		for (const guess of this.guesses) {
			if (guess.guess > this.questionInfo.answer) {
				break;
			}
			winningGuessIdx++;
		}
		
		const winningGuess: GuessJson | undefined = this.guesses[winningGuessIdx];
		const winningColors = this.winningColors(winningGuess);
		const winningTarget = this.normalizeTarget(winningGuessIdx >= 0 ? guessToTarget(this.guesses.length, winningGuessIdx) : "AllTooHigh");
		
		// Payout all bets. Ties are handled by normalizing bets on submission,
		// so they do not need to be handled here.
		for (const bet of this.bets) {
			const payout = this.payoutForBet(bet, this.bets, winningTarget, winningColors);
			
			const player = this.playerManager.getPublicPlayer(bet.player);
			player.chips += payout;
			conclusion.players.earnings[player.publicId]! += payout;
		}
		
		for (const bet of this.spectatorBets) {
			const payout = this.payoutForBet(bet, this.spectatorBets, winningTarget, winningColors);
			
			const player = this.playerManager.getPublicSpectator(bet.player);
			player.chips += payout;
			conclusion.spectators.earnings[player.publicId]! += payout;
		}
		
		// Award bonus chips to the player who got the correct guess. Handle
		// ties by awarding bonus chips to all players with the same guess.
		this.addWinners(this.guesses, winningGuess?.guess ?? 0, conclusion.players);
		
		// Distribute bonus chips to spectators who guessed as well or better
		// than the winning player.
		this.addWinners(this.specGuesses, winningGuess?.guess ?? 0, conclusion.spectators);
		
		return conclusion;
	}
	
	private payoutForBet(bet: Bet, bets: Bet[], winningTarget: BetTarget, winningColors: Set<String>): number {
		// Normalize bet by moving it to the highest valued target with the same
		// guess. This gives the player the best possible payout.
		const target = this.normalizeTarget(bet.target);
		const winningPayout = payoutForTarget(winningTarget);
		const multiplier =
			target === winningTarget ? winningPayout :
				(typeof (target) === "string" && winningColors.has(target)) ? 1 : -1;

		// Players always get their reserved chip(s) back, at minimum.
		return Math.max(reservedChipsFor(bet, bets), (multiplier + 1) * bet.wager);
	}
	
	private addWinners(guesses: Guess[], winningGuess: number, bettingResults: BettingResults) {
		for (const guess of guesses) {
			if (guess.guess >= winningGuess && guess.guess <= this.questionInfo.answer) {
				const player = this.playerManager.getPublicParticipant(guess.player)!;
				player.chips += this.round;
				bettingResults.winners.push(player.publicId);
				bettingResults.earnings[player.publicId]! += this.round;
			}
		}
	}
	
	public toJson(forPlayer: PrivateId): BettingPhaseState {
		const specPublicId = this.playerManager.tryGetPrivateSpectator(forPlayer)?.publicId;
		const spectatorGuess = this.specGuesses.find(guess => guess.player === specPublicId);
		
		return {
			phase: "betting",
			questionInfo: stripAnswer(this.questionInfo),
			guesses: this.guesses.map(guess => ({
				player: guess.player,
				target: guess.target,
				guess: guess.guess
			})),
			spectatorGuess: spectatorGuess?.guess,
			bets: this.bets,
			spectatorBets: this.filterBetsForSpectator(forPlayer),
			roundDuration: this.options.bettingPhaseDuration,
			roundEnd: this.endTime
		};
	}
	
	public onEndPhase(): Observable<void> {
		return this.endPhaseSubj.asObservable();
	}
	
	public endPhase(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		this.endPhaseSubj.next();
		this.endPhaseSubj.complete();
	}
	
	// Return all the colors that have a winning guess.
	private winningColors(winningGuess: GuessJson | undefined): Set<String> {
		// Colors assigned to each target.
		const targetColors = [R, R, R, N, B, B, B];
		
		if (!winningGuess) {
			return new Set();
		}
		return new Set(
			this.guesses.filter(guess => guess.guess === winningGuess.guess)
				.map(guess => targetColors[guess.target as number]!.description!));
	}
	
	private validateTarget(target: BetTarget): void {
		if (typeof target === "number") {
			const guess = this.targetToGuess(target);
			if (guess === undefined) {
				throw new HttpError(400, `Invalid bet target. ${target} is not a valid target for ${this.guesses.length} guesses.`);
			}
		}
	}
	
	// Validate the given bet.
	private validateWager(player: Participant, bets: Bet[], wager: number, existingBet?: Bet): void {
		const existingWager = existingBet ? existingBet.wager : 0;
		if (wager < 0 || wager > player.chips + existingWager || !Number.isInteger(wager)) {
			throw new HttpError(400, `Invalid wager. ${wager} is not an integer between 1 and ${player.chips}`);
		}
		
		const otherExistingBets = bets.filter(bet => bet !== existingBet && bet.player === player.publicId).length;
		if (otherExistingBets == 2) {
			throw new HttpError(400, `Only two bets per player allowed. Player ${player.publicId} has played ${otherExistingBets} bets.`);
		} else if (otherExistingBets > 2) {
			throw new HttpError(500, `Player ${player.publicId} somehow has too many ${otherExistingBets} bets. This should not happen.`);
		}
	}
	
	// When targets are tied, we need to pick a canonical target to use for bets
	// and payouts. We do this returning the highest payout, breaking ties by
	// player ID. This ensures that the best possible payout is always used for
	// bets. Elsewhere, we also ensure that all players with this guess receive
	// round bonus chips.
	private normalizeTarget(target: BetTarget): BetTarget {
		if (typeof(target) !== "number") {
			return target;
		}
		
		const targetGuess = this.targetToGuess(target)!;  // Safe because we already validated.
		const bestGuess = this.guesses.filter(guess => guess.guess === targetGuess.guess)
			.sort((first, second) =>
				first.player < second.player ? -1 :
				first.player > second.player ? 1 : 0)
			.sort((first, second) => payoutForTarget(second.target) - payoutForTarget(first.target))
			.at(0)!;
		return guessToTarget(this.guesses.length, this.guesses.findIndex(guess => guess === bestGuess));
	}
	
	// Filters bets to only those that the spectator should see.
	private filterBetsForSpectator(privateId: PrivateId): Bet[] {
		const publicId = this.playerManager.tryGetPrivateSpectator(privateId)?.publicId ?? "";
		return this.spectatorBets.filter(bet => bet.player == publicId);
	}
}
