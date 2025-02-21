import type { Observable } from "rxjs";

import type { PrivateId } from "../../shared/player.js";
import type { BettingPhaseJson, EndPhaseJson, QuestionPhaseJson } from "../../shared/game/game.js";


export interface Phase {
	endPhase(): void;
	onEndPhase(): Observable<void>;
	toJson(forPlayer: PrivateId): QuestionPhaseJson | BettingPhaseJson | EndPhaseJson;
}
