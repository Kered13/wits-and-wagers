import { Subject, type Observable } from "rxjs";

import { type Phase } from "./phase.js";
import { Player, Spectator } from "../player/player.js";
import { type PlayerManager } from "../player/player-manager.js";
import { type QuestionPhaseState } from "../../shared/game/question-phase.js";
import { type PrivateId } from "../../shared/player.js";
import { stripAnswer, type QuestionAnswerInfo } from "../../shared/game/question.js";


export type QuestionPhaseOptions = {
	endQuestionPhaseWhenAllGuessesSubmitted: boolean;
	// In milliseconds.
	questionPhaseDuration?: number;
}


export const DEFAULT_QUESTION_PHASE_OPTIONS: QuestionPhaseOptions = {
	endQuestionPhaseWhenAllGuessesSubmitted: true,
	// In milliseconds.
	questionPhaseDuration: undefined
};


export class QuestionPhase implements Phase {
	private readonly guesses = new Map<Player, number>();
	private readonly specGuesses = new Map<Spectator, number>();
	private readonly endPhaseSubj: Subject<void> = new Subject<void>();
	private readonly timeout: NodeJS.Timeout | undefined;
	// Phase end time as millisecond timestamp.
	private readonly endTime: number | undefined;
	
	constructor(
			private readonly questionInfo: QuestionAnswerInfo,
			private readonly playerManager: PlayerManager,
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
		const player = this.playerManager.getPrivateParticipant(playerId);
		if (player instanceof Player) {
			this.guesses.set(player, guess);
			
			// If every player has submitted a guess, end the phase.
			const submittedPlayers = Array.from(this.guesses.keys());
			if (this.options.endQuestionPhaseWhenAllGuessesSubmitted &&
					this.playerManager.getAllPlayers().every(p => submittedPlayers.includes(p))) {
				this.endPhase();
			}
		} else {
			this.specGuesses.set(player, guess);
		}
	}
	
	public getGuesses(): [Map<Player, number>, Map<Spectator, number>] {
		return [this.guesses, this.specGuesses];
	}
	
	public onEndPhase(): Observable<void> {
		return this.endPhaseSubj.asObservable();
	}
	
	public toJson(forPlayer: PrivateId): QuestionPhaseState {
		return {
			phase: "question",
			questionInfo: stripAnswer(this.questionInfo),
			guesses: Object.fromEntries(
				this.playerManager.getAllPlayers().map(player => {
					const guess = this.guesses.get(player);
					const report = !guess ? false :
						player.privateId !== forPlayer ? true : guess;
					return [player.publicId, report];
				})),
			spectatorGuess: this.getSpectatorGuess(forPlayer),
			roundDuration: this.options.questionPhaseDuration,
			roundEnd: this.endTime,
		};
	}
	
	public endPhase(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		this.endPhaseSubj.next();
		this.endPhaseSubj.complete();
	}
	
	private getSpectatorGuess(specId: PrivateId): number | undefined {
		const spectator = this.playerManager.tryGetPrivateSpectator(specId);
		if (!spectator) {
			return undefined;
		}
		return this.specGuesses.get(spectator);
	}
}
