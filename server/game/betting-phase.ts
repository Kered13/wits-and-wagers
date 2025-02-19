import { Subject, type Observable } from "rxjs";

import type { Phase } from "./phase.js";
import type { Player, PlayerManager } from "./player.js";
import { HttpError } from "../utils/httperror.js";
import { type BetJson, type BetTarget, type BettingPhaseJson, type GuessJson } from "../../shared/game/game.js";
import { type PrivateId } from "../../shared/player.js";


// Indicates whether each guess is Red or Black, by number of players in
// the game.
const N = Symbol("None");
const R = Symbol("Red");
const B = Symbol("Black");


type Guess = GuessJson & {
	payout: number,
	color: Symbol
};


export type BettingPhaseOptions = {};


export class BettingPhase implements Phase {
	private readonly bets: BetJson[] = [];
	private readonly guesses: Guess[];
	private readonly endPhaseSubj = new Subject<void>();
	
	constructor(
			private readonly question: string,
			private readonly answer: number,
			private readonly players: PlayerManager,
			private readonly round: number,
			guesses: Map<Player, number>,
			private readonly options: BettingPhaseOptions) {
		// Payouts, by number of players in the game.
		const payoutMultipliers = [
			[],  // 0 guesses should never happen.
			[2],
			[3, 3],
			[3, 2, 3],
			[4, 3, 3, 4],
			[4, 3, 2, 3, 4],
			[5, 4, 3, 3, 4, 5],
			[5, 4, 3, 2, 3, 4, 5]
		][guesses.size]!;
		
		// Colors assigned to each guess, by number of players in the game.
		const targetColors = [
			[],
			[N],
			[R, B],
			[R, N, B],
			[R, R, B, B],
			[R, R, N, B, B],
			[R, R, R, B, B, B],
			[R, R, R, N, B, B, B]
		][guesses.size]!;

		this.guesses = Array.from(guesses)
			.sort((first, second) => first[1] - second[1])
			.map(([player, guess], i): Guess => ({
				player: player.publicId,
				guess: guess,
				payout: payoutMultipliers[i]!,
				color: targetColors[i]!
			}));
	}
	
	public submitBet(playerId: PrivateId, target: BetTarget, wager: number): void {
		const player = this.players.getPrivatePlayer(playerId);
		this.validateBet(player, target, wager);
		
		// Normalize bet by moving it to the highest valued target with the same
		// guess. This gives the player the best possible payout.
		target = this.normalizeTarget(target);
		
		this.bets.push({ player: player.publicId, target: target, wager: wager });
		// Deduct the wager from the player's chips.
		player.chips -= wager;
	}
	
	public withdrawBet(playerId: PrivateId, target: BetTarget): void {
		const player = this.players.getPrivatePlayer(playerId);
		const i = this.bets.findIndex(bet => bet.player === player.publicId && bet.target === target);
		if (i > -1) {
			// Return the player's chips.
			player.chips += this.bets[i]!.wager;
			this.bets.splice(i, 1);
		} else {
			throw new HttpError(400, `Player ${playerId } does not have a bet on target ${target}.`);
		}
	}
	
	// Finds the winning guess and computes payouts based on bets.
	public resolve(): void {
		let winningGuessIdx = -1;
		for (const guess of this.guesses) {
			if (guess.guess > this.answer) {
				break;
			}
			winningGuessIdx++;
		}
		const winningGuess: Guess | undefined = this.guesses[winningGuessIdx];
		const winningColors = this.winningColors(winningGuess);
		const winningPayout = winningGuess?.payout ?? 6;
		const winningTarget = this.normalizeTarget(winningGuessIdx >= 0 ? winningGuessIdx : "AllTooHigh");
		
		// Payout all bets. Ties are handled by normalizing bets on submission,
		// so they do not need to be handled here.
		for (const bet of this.bets) {
			const multiplier =
				bet.target === winningTarget ? winningPayout :
				(typeof(bet.target) === "string" && winningColors.has(bet.target)) ? 1 : -1;
			
			// Players always get their reserved chip(s) back, at minimum.
			const payout = Math.max(this.reservedChipsFor(bet), (multiplier + 1) * bet.wager);
			const player = this.players.getPublicPlayer(bet.player);
			player.chips += payout;
		}
		
		// Award bonus chips to the player who got the correct guess. Handle
		// ties by awarding bonus chips to all players with the same guess.
		if (winningGuess) {
			this.guesses
				.filter(guess => guess.guess === winningGuess.guess)
				.map(guess => this.players.getPublicPlayer(guess.player))
				.forEach(player => player.chips += this.round);
		}
	}
	
	public toJson(forPlayer: PrivateId): BettingPhaseJson {
		return {
			phase: "betting",
			question: this.question,
			guesses: this.guesses.map(guess => ({
				player: guess.player,
				guess: guess.guess
			})),
			bets: this.bets
		};
	}
	
	public onEndPhase(): Observable<void> {
		return this.endPhaseSubj.asObservable();
	}
	
	// TODO: We probably don't want this long term.
	public endPhase(): void {
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
	
	// Validate the given bet.
	private validateBet(player: Player, target: BetTarget, wager: number): void {
		if (typeof target === "number") {
			if (target < 0 || target >= this.guesses.length) {
				throw new HttpError(400, `Invalid bet target. ${target} is not between 0 and ${this.bets.length - 1}.`);
			}
		}
		
		if (wager < 1 || wager > player.chips || !Number.isInteger(wager)) {
			throw new HttpError(400, `Invalid wager. ${wager} is not an integer between 1 and ${player.chips}`);
		}
		
		const existingBets = this.bets.filter(bet => bet.player === player.publicId).length;
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
		const targetGuess = this.guesses[target]!;
		const bestGuess = this.guesses.filter(guess => guess.guess === targetGuess.guess)
			.sort((first, second) =>
				first.player < second.player ? -1 :
				first.player > second.player ? 1 : 0)
			.sort((first, second) => second.payout - first.payout)
			.at(0)!;
		return this.guesses.findIndex(guess => guess === bestGuess);
	}
	
	// Returns the number of reserved chips a player should get for each of
	// their losing bets.
	private reservedChipsFor(bet: BetJson): number {
		const numBets = this.bets.filter(bet2 => bet2.player === bet.player).length;
		
		// A player who made no bets gets no reserved chips back. A player who
		// made one bet gets up to two chips back. A player who made two bets
		// gets one chip back for each bet. But a player can never get back more
		// than they wagered.
		return Math.min(bet.wager, [0, 2, 1][numBets]!);
	}
}
