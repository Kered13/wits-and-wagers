import type { Game } from "./game.js";
import type { Player } from "./player.js";
import { type QuestionPhaseJson } from "../../shared/game/game.js";
import { type PrivateId } from "../../shared/player.js";


export class QuestionPhase {
	private readonly guesses = new Map<Player, number>();
	
	constructor(
		private readonly question: string,
		private readonly game: Game) {}
	
	public submitGuess(playerId: PrivateId, guess: number): void {
		const player = this.game.getPlayer(playerId);
		this.guesses.set(player, guess);
	}
	
	public getGuesses(): Map<Player, number> {
		return this.guesses;
	}
	
	public toJson(forPlayer: PrivateId): QuestionPhaseJson {
		return {
			phase: "question",
			question: this.question,
			guesses: Object.fromEntries(
				this.game.getPlayers().map(player => {
					const guess = this.guesses.get(player);
					const report = !guess ? false :
						player.privateId !== forPlayer ? true : guess;
					return [player.publicId, report];
				}))
		};
	}
}
