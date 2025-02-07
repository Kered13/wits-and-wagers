import type { Game } from "./game.js";
import type { Player } from "./player.js";
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


export class BettingPhase {
	private readonly bets: BetJson[] = [];
	private readonly guesses: Guess[];
	
	constructor(
			private readonly question: string,
			private readonly answer: number,
			private readonly game: Game,
			guesses: Map<Player, number>) {
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
			.map(([player, guess], i): Guess => ({
				player: player.publicId,
				guess: guess,
				payout: payoutMultipliers[i]!,
				color: targetColors[i]!
			}))
			.sort((first, second) => first.guess - second.guess);
	}
	
	public submitBet(playerId: PrivateId, target: BetTarget, wager: number): void {
		const player = this.game.getPlayer(playerId);
		this.validateBet(player, target, wager);
		
		// Normalize bet by moving it to the highest valued target with the same
		// guess. This gives the player the best possible payout.
		if (typeof target === "number") {
			const targetGuess = this.guesses[target]!;
			const bestGuess = this.guesses.filter(guess => guess.guess === targetGuess.guess)
				.sort((first, second) => second.payout - first.payout)
				.at(0)!;
			target = this.guesses.findIndex(guess => guess === bestGuess);
		}
		
		this.bets.push({ player: player.publicId, target: target, wager: wager });
		// Deduct the wager from the player's chips.
		player.chips -= wager;
	}
	
	public withdrawBet(playerId: PrivateId, target: BetTarget): void {
		const player = this.game.getPlayer(playerId);
		const i = this.bets.findIndex(bet => bet.player === player.publicId && bet.target === target);
		if (i > -1) {
			// Return the player's chips.
			player.chips += this.bets[i]!.wager;
			this.bets.splice(i, 1);
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
		const winningColor = winningGuess ? winningGuess.color : N;
		const winningPayout = winningGuess ? winningGuess.payout : 6;
		const winningTarget = winningGuessIdx >= 0 ? winningGuessIdx : "AllTooHigh";
		
		// Payout all bets. Ties are handled by normalizing bets on submission,
		// so they do not need to be handled here.
		for (const bet of this.bets) {
			const multiplier =
				bet.target == winningTarget ? winningPayout :
				bet.target === winningColor.description ? 1 : 0;
			
			// Players always get their reserved chip back, at minimum.
			const payout = Math.max(1, (multiplier + 1) * bet.wager);
			const player = this.game.getPlayer(bet.player);
			player.chips += payout;
		}
		
		// Award bonus chips to the player who got the correct guess. Handle
		// ties by awarding bonus chips to all players with the same guess.
		if (winningGuessIdx > -1) {
			const winningGuess = this.guesses[winningGuessIdx]!;
			this.guesses
				.filter(guess => guess.guess === winningGuess.guess)
				.map(guess => this.game.getPlayer(guess.player))
				.forEach(player => player.chips += this.game.getRound());
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
	
	// Validate the given bet.
	private validateBet(player: Player, target: BetTarget, wager: number): void {
		if (typeof target === "number") {
			if (target < 0 || target >= this.bets.length) {
				throw new HttpError(400, `Invalid bet target. ${target} is not between 0 and ${this.bets.length - 1}.`);
			}
		}

		if (wager < 1 || wager > player.chips) {
			throw new HttpError(400, `Invalid wager. ${wager} is not between 1 and ${player.chips}`);
		}

		const existingBets = this.bets.filter(bet => bet.player === player.publicId).length;
		if (existingBets == 2) {
			throw new HttpError(400, `Only two bets per player allowe. Player ${player.publicId} has played ${existingBets} bets.`);
		} else if (existingBets > 2) {
			throw new HttpError(500, `Player ${player.publicId} somehow has too many ${existingBets} bets. This should not happen.`);
		}
	}
}
