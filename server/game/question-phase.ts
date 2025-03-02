import type { Phase } from "./phase.js";
import type { Player, PlayerManager } from "./player.js";
import { type QuestionPhaseState } from "../../shared/game/game.js";
import { type PrivateId } from "../../shared/player.js";
import { Subject, type Observable } from "rxjs";


export type QuestionPhaseOptions = {
	endQuestionPhaseWhenAllGuessesSubmitted: boolean;
	questionPhaseTime?: number;
}

export const questionPhaseDefaultOptions: QuestionPhaseOptions = {
	endQuestionPhaseWhenAllGuessesSubmitted: true,
	questionPhaseTime: undefined
};


export class QuestionPhase implements Phase {
	private readonly guesses = new Map<Player, number>();
	private readonly endPhaseSubj: Subject<void> = new Subject<void>();
	private readonly timeout: NodeJS.Timeout | undefined;
	
	constructor(
			private readonly question: string,
			private readonly players: PlayerManager,
			private readonly options: QuestionPhaseOptions) {
		if (options.questionPhaseTime) {
			this.timeout = setTimeout(() => this.endPhase(), options.questionPhaseTime * 1000);
		}
	}
	
	public submitGuess(playerId: PrivateId, guess: number): void {
		const player = this.players.getPrivatePlayer(playerId);
		this.guesses.set(player, guess);
		
		// If every player has submitted a guess, end the phase.
		const submittedPlayers = Array.from(this.guesses.keys());
		if (this.options.endQuestionPhaseWhenAllGuessesSubmitted &&
				this.players.getAll().every(p => submittedPlayers.includes(p))) {
			this.endPhase();
		}
	}
	
	public getGuesses(): Map<Player, number> {
		return this.guesses;
	}
	
	public onEndPhase(): Observable<void> {
		return this.endPhaseSubj.asObservable();
	}
	
	public toJson(forPlayer: PrivateId): QuestionPhaseState {
		return {
			phase: "question",
			question: this.question,
			guesses: Object.fromEntries(
				this.players.getAll().map(player => {
					const guess = this.guesses.get(player);
					const report = !guess ? false :
						player.privateId !== forPlayer ? true : guess;
					return [player.publicId, report];
				}))
		};
	}
	
	public endPhase(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		this.endPhaseSubj.next();
		this.endPhaseSubj.complete();
	}
}
