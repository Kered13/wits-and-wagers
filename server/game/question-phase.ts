import { type Phase } from "./phase.js";
import { type Player } from "./player.js";
import { type QuestionPhaseState } from "../../shared/game/question-phase.js";
import { type PrivateId } from "../../shared/player.js";
import { Subject, type Observable } from "rxjs";
import { type PlayerManager } from "./player-manager.js";


export type QuestionPhaseOptions = {
	endQuestionPhaseWhenAllGuessesSubmitted: boolean;
	// In milliseconds.
	questionPhaseDuration?: number;
}

export const questionPhaseDefaultOptions: QuestionPhaseOptions = {
	endQuestionPhaseWhenAllGuessesSubmitted: true,
	// In milliseconds.
	questionPhaseDuration: undefined
};


export class QuestionPhase implements Phase {
	private readonly guesses = new Map<Player, number>();
	private readonly endPhaseSubj: Subject<void> = new Subject<void>();
	private readonly timeout: NodeJS.Timeout | undefined;
	// Phase end time as millisecond timestamp.
	private readonly endTime: number | undefined;
	
	constructor(
			private readonly question: string,
			private readonly players: PlayerManager<Player>,
			private readonly options: QuestionPhaseOptions) {
		if (options.questionPhaseDuration) {
			// Add a small fudge factor to the round duration. This is just to
			// give players some leniency and account for latency.
			const phaseDuration = options.questionPhaseDuration + 300;
			this.timeout = setTimeout(() => this.endPhase(), phaseDuration);
			this.endTime = new Date().getTime() + phaseDuration;
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
				})),
			...this.options.questionPhaseDuration && { roundDuration: this.options.questionPhaseDuration },
			...this.endTime && { roundEnd: this.endTime }
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
