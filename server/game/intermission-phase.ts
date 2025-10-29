import { Subject, type Observable } from "rxjs";

import { type Phase } from "./phase.js";
import { type PrivateId } from "../../shared/player.js";
import { type BettingConclusion, type IntermissionPhaseState, type SkippedBettingPhase } from "../../shared/game/intermission-phase.js";
import { type QuestionAnswerInfo } from "../../shared/game/question.js";


export type IntermissionPhaseOptions = {
	// In milliseconds.
	intermissionPhaseDuration: number;
};

export const DEFAULT_INTERMISSION_PHASE_OPTIONS: IntermissionPhaseOptions = {
	intermissionPhaseDuration: 5000
};


export class IntermissionPhase implements Phase {
	private readonly endPhaseSubj = new Subject<void>();
	private readonly timeout: NodeJS.Timeout;
	
	constructor(
			private readonly questionInfo: QuestionAnswerInfo,
			private readonly outcome: SkippedBettingPhase | BettingConclusion,
			options: IntermissionPhaseOptions) {
		this.timeout = setTimeout(() => this.endPhase(), options.intermissionPhaseDuration);
	}
	
	endPhase(): void {
		clearTimeout(this.timeout);
		this.endPhaseSubj.next();
		this.endPhaseSubj.complete();
	}
	
	onEndPhase(): Observable<void> {
		return this.endPhaseSubj.asObservable();
	}
	
	toJson(forPlayer: PrivateId): IntermissionPhaseState {
		return {
			phase: "intermission",
			questionInfo: this.questionInfo,
			outcome: this.outcome
		};
	}
}
