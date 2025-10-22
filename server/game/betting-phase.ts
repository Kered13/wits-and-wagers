import { Subject, type Observable } from "rxjs";

import { type Phase } from "./phase.js";
import { Participant, Spectator, type Player } from "../player/player.js";
import { type PlayerManager } from "../player/player-manager.js";
import { HttpError } from "../utils/httperror.js";
import { type Bet, type BetTarget, type BettingPhaseState, type Guess as GuessJson, type GuessTarget } from "../../shared/game/betting-phase.js";
import { type PrivateId, type PublicId } from "../../shared/player.js";
import { type BettingConclusion } from "../../shared/game/intermission-phase.js";
import { stripAnswer, type QuestionAnswerInfo } from "../../shared/game/question.js";


// Indicates whether each guess is Red or Black, by number of players in
// the game.
const N = Symbol("None");
const R = Symbol("Red");
const B = Symbol("Black");


type Guess = GuessJson & {
	payout: number,
	color: Symbol
};


export type BettingPhaseOptions = {
	// In milliseconds.
	bettingPhaseDuration?: number;
};

export const bettingPhaseDefaultOptions: BettingPhaseOptions = {
	bettingPhaseDuration: undefined
};


export class BettingPhase implements Phase {
	private readonly bets: Bet[] = [];
	private readonly guesses: Guess[];
	private readonly endPhaseSubj = new Subject<void>();
	private readonly timeout: NodeJS.Timeout | undefined;
	// Phase end time as millisecond timestamp.
	private readonly endTime: number | undefined;
	
	constructor(
			private readonly questionInfo: QuestionAnswerInfo,
			private readonly players: PlayerManager<Player>,
			private readonly spectators: PlayerManager<Spectator>,
			private readonly round: number,
			guesses: Map<Player, number>,
			private readonly options: BettingPhaseOptions) {
		// Payouts for each target.
		const payoutMultipliers = [5, 4, 3, 2, 3, 4, 5];
		// Colors assigned to each target.
		const targetColors = [R, R, R, N, B, B, B];
		
		this.guesses = Array.from(guesses)
			.sort((first, second) => first[1] - second[1])
			.map(([player, guess], i): Guess => {
				const target = BettingPhase.guessToTarget(guesses.size, i);
				return {
					player: player.publicId,
					target: target,
					guess: guess,
					payout: payoutMultipliers[target]!,
					color: targetColors[target]!,
				};
			});
		
		if (options.bettingPhaseDuration) {
			// Add a small fudge factor to the round duration. This is just to
			// give players some leniency and account for latency.
			const phaseDuration = options.bettingPhaseDuration + 300;
			this.timeout = setTimeout(() => this.endPhase(), phaseDuration);
			this.endTime = new Date().getTime() + phaseDuration;
		}
	}
	
	private targetToGuess(target: GuessTarget): Guess | undefined {
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
	
	private static guessToTarget(numPlayers: number, guessIdx: number): GuessTarget {
		const targetMap: GuessTarget[][] = [
			[                   ],
			[         3         ],
			[      2,    4      ],
			[      2, 3, 4      ],
			[   1, 2,    4, 5   ],
			[   1, 2, 3, 4, 5   ],
			[0, 1, 2,    4, 5, 6],
			[0, 1, 2, 3, 4, 5, 6],
		];
		return targetMap[numPlayers]![guessIdx]!;
	}
	
	private guessToTarget(guessIdx: number): GuessTarget {
		return BettingPhase.guessToTarget(this.guesses.length, guessIdx);
	}
	
	public submitBet(playerId: PrivateId, target: BetTarget, wager: number): void {
		const player = this.getPrivatePlayerOrSpectator(playerId);
		
		this.validateTarget(target);
		
		// Normalize bet by moving it to the highest valued target with the same
		// guess. This gives the player the best possible payout.
		target = this.normalizeTarget(target);
		
		const existingBetIdx = this.bets.findIndex(bet => bet.player === player.publicId && bet.target === target);
		const existingBet = existingBetIdx >= 0 ? this.bets[existingBetIdx]! : undefined;
		this.validateWager(player, wager, existingBet);
		
		if (existingBet) {
			player.chips += existingBet.wager;
			this.bets.splice(existingBetIdx, 1);
		}
		
		if (wager > 0) {
			this.bets.push({ player: player.publicId, target: target, wager: wager });
			// Deduct the wager from the player's chips.
			player.chips -= wager;
		}
	}
	
	public withdrawBet(playerId: PrivateId, target: BetTarget): void {
		const player = this.getPrivatePlayerOrSpectator(playerId);
		const i = this.bets.findIndex(bet => bet.player === player.publicId && bet.target === target);
		if (i > -1) {
			// Return the player's chips.
			player.chips += this.bets[i]!.wager;
			this.bets.splice(i, 1);
		} else {
			throw new HttpError(400, `Player ${playerId } does not have a bet on target ${target}.`);
		}
	}
	
	// Finds the winning guess and computes payouts based on bets. Returns a
	// summary of the results of the round.
	public resolve(): BettingConclusion {
		const conclusion: BettingConclusion = {
			type: "conclusion",
			winners: [],
			earnings: Object.fromEntries(this.players.getAll().map(player => [player.publicId, 0])),
			spectatorEarnings: Object.fromEntries(this.spectators.getAll().map(player => [player.publicId, 0]))
		};
		
		let winningGuessIdx = -1;
		for (const guess of this.guesses) {
			if (guess.guess > this.questionInfo.answer) {
				break;
			}
			winningGuessIdx++;
		}
		const winningGuess: Guess | undefined = this.guesses[winningGuessIdx];
		const winningColors = this.winningColors(winningGuess);
		const winningPayout = winningGuess?.payout ?? 6;
		const winningTarget = this.normalizeTarget(winningGuessIdx >= 0 ? this.guessToTarget(winningGuessIdx) : "AllTooHigh");
		
		// Payout all bets. Ties are handled by normalizing bets on submission,
		// so they do not need to be handled here.
		for (const bet of this.bets) {
			const multiplier =
				bet.target === winningTarget ? winningPayout :
				(typeof(bet.target) === "string" && winningColors.has(bet.target)) ? 1 : -1;
			
			// Players always get their reserved chip(s) back, at minimum.
			const payout = Math.max(this.reservedChipsFor(bet), (multiplier + 1) * bet.wager);
			const player = this.getPublicPlayerOrSpectator(bet.player);
			player.chips += payout;
			
			if (this.players.hasPublicPlayer(player.publicId)) {
				conclusion.earnings[player.publicId]! += payout;
			} else {
				conclusion.spectatorEarnings[player.publicId]! += payout;
			}
		}
		
		// Award bonus chips to the player who got the correct guess. Handle
		// ties by awarding bonus chips to all players with the same guess.
		if (winningGuess) {
			this.guesses
				.filter(guess => guess.guess === winningGuess.guess)
				.map(guess => this.players.getPublicPlayer(guess.player))
				.forEach(player => {
					player.chips += this.round;
					conclusion.winners.push(player.publicId);
					conclusion.earnings[player.publicId]! += this.round;
				});
		}
		
		return conclusion;
	}
	
	public toJson(forPlayer: PrivateId): BettingPhaseState {
		return {
			phase: "betting",
			questionInfo: stripAnswer(this.questionInfo),
			guesses: this.guesses.map(guess => ({
				player: guess.player,
				target: guess.target,
				guess: guess.guess
			})),
			bets: this.bets,
			...this.options.bettingPhaseDuration && { roundDuration: this.options.bettingPhaseDuration },
			...this.endTime && { roundEnd: this.endTime }
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
	private winningColors(winningGuess: Guess | undefined): Set<String> {
		if (!winningGuess) {
			return new Set();
		}
		return new Set(
			this.guesses.filter(guess => guess.guess === winningGuess.guess)
				.map(guess => guess.color)
				.map(guess => guess.description!));
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
	private validateWager(player: Participant, wager: number, existingBet?: Bet): void {
		const existingWager = existingBet ? existingBet.wager : 0;
		if (wager < 0 || wager > player.chips + existingWager || !Number.isInteger(wager)) {
			throw new HttpError(400, `Invalid wager. ${wager} is not an integer between 1 and ${player.chips}`);
		}
		
		const existingBets = this.bets.filter(bet => bet !== existingBet && bet.player === player.publicId).length;
		if (existingBets == 2) {
			throw new HttpError(400, `Only two bets per player allowed. Player ${player.publicId} has played ${existingBets} bets.`);
		} else if (existingBets > 2) {
			throw new HttpError(500, `Player ${player.publicId} somehow has too many ${existingBets} bets. This should not happen.`);
		}
	}
	
	// When targets are tied, we need to pick a canonical target to use for bets
	// and payouts. We do this returning hte highest payout, breaking ties by
	// player ID. This ensures that the best possible payout is always used for
	// bets. Separately, we ensure that all players with this guess receive
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
			.sort((first, second) => second.payout - first.payout)
			.at(0)!;
		return this.guessToTarget(this.guesses.findIndex(guess => guess === bestGuess));
	}
	
	// Returns the number of reserved chips a player should get for each of
	// their losing bets.
	private reservedChipsFor(bet: Bet): number {
		const numBets = this.bets.filter(bet2 => bet2.player === bet.player).length;
		
		// A player who made no bets gets no reserved chips back. A player who
		// made one bet gets up to two chips back. A player who made two bets
		// gets one chip back for each bet. But a player can never get back more
		// than they wagered.
		return Math.min(bet.wager, [0, 2, 1][numBets]!);
	}
	
	private getPrivatePlayerOrSpectator(playerId: PrivateId): Participant {
		const player = this.players.tryGetPrivatePlayer(playerId) ?? this.spectators.tryGetPrivatePlayer(playerId);
		if (!player) {
			throw new HttpError(404, `Player or spectator private ID ${playerId} not found.`);
		}
		return player;
	}
	
	private getPublicPlayerOrSpectator(playerId: PublicId): Participant {
		const player = this.players.tryGetPublicPlayer(playerId) ?? this.spectators.tryGetPublicPlayer(playerId);
		if (!player) {
			throw new HttpError(404, `Player or spectator private ID ${playerId} not found.`);
		}
		return player;
	}
}
