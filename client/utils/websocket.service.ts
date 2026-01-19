import { delay, EMPTY, Observable, of, retry, Subject, throwError } from "rxjs";
import { WebSocketSubject } from "rxjs/webSocket";

import { BackendService } from "./backend.service";
import { Closeable } from "./refcounted";
import { WebsocketError } from "./websocket-error";


export abstract class WebsocketService extends Closeable {
	private static readonly RETRY_DELAY_MS = 3000;
	private static readonly RETRY_BACKOFF_EXPONENT = 1.5;
	private static readonly MAX_RETRIES = 7;
	
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
		
		// If the server closes the connection, close the websocket.
		this.retryWsSubject.subscribe({
			complete: () => this.close(),
			error: () => this.close(),
		});
	}

	protected abstract onOpen(event: Event): void;
	protected abstract onClose(): void;
	
	protected override doClose(): void {
		// If closing from our end, we need to call complete. If closed by the
		// server, this is a no-op.
		this.retryWsSubject.complete();
		this.wsSubject.complete();
		this.onClose();
	}
	
	private retry(error: any, retryCount: number): Observable<any> {
		if (this.isClosed()) {
			// Signal that we should not retry the connection.
			return EMPTY;
		}
		
		if (!(error instanceof Event)) {
			return throwError(() => error);
		}
		
		if (retryCount > WebsocketService.MAX_RETRIES) {
			return throwError(() => new WebsocketError(`Maximum retry attempts reached.\nCaused by: ${error} | ${JSON.stringify(error)}`));
		}
		
		if (error instanceof CloseEvent) {
			console.warn(`Connection to server lost. Reconnecting...`);
		} else {
			console.warn(`WebSocket error not CloseEvent (failed to open?). Reconnecting...`);
		}
		
		// Signal that we should retry the connection.
		const delayMs = retryCount <= 1 ? 0 :
			WebsocketService.RETRY_DELAY_MS * WebsocketService.RETRY_BACKOFF_EXPONENT ** (retryCount - 1);
		return of(0).pipe(delay(delayMs));
	}
};
