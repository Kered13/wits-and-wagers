import type { Observable } from "rxjs";


export interface Phase {
	endPhase(): void;
	onEndPhase(): Observable<void>;
}
