import { Subject, type Observable } from "rxjs";

import { type Phase } from "./phase.js";
import { type PrivateId } from "../../shared/player.js";
import type { BettingConclusion, IntermissionPhaseState, SkippedBettingPhase } from "../../shared/game/intermission-phase.js";


export type IntermissionPhaseOptions = {
	// In milliseconds.
	intermissionPhaseDuration: number;
};

export const intermissionPhaseDefaultOptions: IntermissionPhaseOptions = {
	intermissionPhaseDuration: 5000
};


export class IntermissionPhase implements Phase {
	private readonly endPhaseSubj = new Subject<void>();
	private readonly timeout: NodeJS.Timeout;
	
	constructor(
			private readonly question: string,
			private readonly answer: number,
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
			question: this.question,
			answer: this.answer,
			outcome: this.outcome
		};
	}
}
