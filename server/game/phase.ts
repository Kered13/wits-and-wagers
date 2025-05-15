import { type Observable } from "rxjs";

import { type PrivateId } from "../../shared/player.js";
import { type BettingPhaseState } from "../../shared/game/betting-phase.js";
import { type GameOverPhaseState } from "../../shared/game/game.js";
import { type QuestionPhaseState } from "../../shared/game/question-phase.js";
import { type IntermissionPhaseState } from "../../shared/game/intermission-phase.js";


export interface Phase {
	endPhase(): void;
	onEndPhase(): Observable<void>;
	toJson(forPlayer: PrivateId): QuestionPhaseState | BettingPhaseState | IntermissionPhaseState | GameOverPhaseState;
}
