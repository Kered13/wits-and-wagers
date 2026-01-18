import { EMPTY, Observable, of, retry, Subject, throwError } from "rxjs";
import { WebSocketSubject } from "rxjs/webSocket";

import { BackendService } from "./backend.service";
import { Closeable } from "./refcounted";


export abstract class WebsocketService extends Closeable {
	protected readonly wsSubject: WebSocketSubject<Object>;
	protected readonly retryWsSubject: Subject<Object>;
	
	constructor(private readonly path: string, protected readonly backend: BackendService) {
		super()
		
		this.wsSubject = this.backend.webSocket({
			url: this.path,
			openObserver: {
				next: (event: Event) => this.onOpen(event),
			},
		});
		
		const retryWebsocket = this.wsSubject.pipe(
			retry({
				delay: (error, retryCount) => this.retry(error, retryCount),
				resetOnSuccess: true,
			}));
		
		this.retryWsSubject = new Subject<Object>();
		retryWebsocket.subscribe(this.retryWsSubject);
		
		// If the server closes the connection, close the websocket. This does
		// not handle unexpected closures like the server crashing.
		this.retryWsSubject.subscribe({
			complete: () => this.close()
		});
	}
	
	public override doClose(): void {
		// If closing from our end, we need to call complete. If closed by the
		// server, this is a no-op.
		this.retryWsSubject.complete();
		this.wsSubject.complete();
		this.onClose();
	}
	
	protected abstract onOpen(event: Event): void;
	protected abstract onClose(): void;
	
	private retry(error: any, retryCount: number): Observable<any> {
		if (this.isClosed()) {
			// Signal that we should not retry the connection.
			return EMPTY;
		}
		if (error instanceof Event) {
			if (error instanceof CloseEvent) {
				console.warn(`Connection to server lost. Reconnecting...`);
			} else {
				console.warn(`WebSocket error not CloseEvent (failed to open?). Reconnecting...`);
			}
			// Signal that we should retry the connection.
			return of(0);
		}
		console.error(`Error that is not Error type. Not retrying. ${error} | ${error.toString()} | ${JSON.stringify(error)}`);
		return throwError(() => error);
	}
};
