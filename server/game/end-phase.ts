import { EMPTY, type Observable } from "rxjs";

import type { Phase } from "./phase.js";
import type { EndPhaseJson } from "../../shared/game/game.js";
import type { PrivateId } from "../../shared/player.js";


export class EndPhase implements Phase {
	constructor() {}
	
	public endPhase(): void {
		// This is the final phase of the game, it cannot end.
	}
	
	public onEndPhase(): Observable<void> {
		// This is the final phase of the game, it cannot end.
		return EMPTY;
	}
	
	public toJson(forPlayer: PrivateId): EndPhaseJson {
		return {
			phase: "end"
		};
	}
}
