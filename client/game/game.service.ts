import { Injectable } from "@angular/core";
import { Observable, map, filter, takeWhile, catchError, of, NEVER } from "rxjs";
import { WebSocketSubject } from 'rxjs/webSocket';
import { is } from "valibot";

import { BackendService } from "../utils/backend.service.js";
import { Closeable, RefCounted } from "../utils/refcounted.js";
import { WebsocketError } from "../utils/websocket-error.js";
import { END_PHASE_PATH, EndPhaseRequest } from "../../shared/game/end-phase.js";
import { BetTarget, GAME_API_ROOT, type GameId, type GameJson } from "../../shared/game/game.js";
import { GameNotificationSchema, type GameNotification } from "../../shared/game/notifications.js";
import { SUBMIT_BET_PATH, SubmitBetRequest } from "../../shared/game/submit-bet.js";
import { SUBMIT_GUESS_PATH, SubmitGuessRequest } from "../../shared/game/submit-guess.js";
import { SUBSCRIBE_PATH, SubscribeRequest } from "../../shared/game/subscribe.js";
import { WITHDRAW_BET_PATH, WithdrawBetRequest } from "../../shared/game/withdraw-bet.js";
import { PrivateId } from "../../shared/player.js";
import { type WebSocketRequest } from "../../shared/websocket.interface.js";


@Injectable({providedIn: "root"})
export class GameService {
	private gameInstances = new Map<GameId, RefCounted<GameInstanceService>>();
	
	constructor(private http: BackendService) {}
	
	private createGameInstanceService(gameId: GameId, privateId: PrivateId): RefCounted<GameInstanceService> {
		return new RefCounted<GameInstanceService>(new GameInstanceService(this, this.http, gameId, privateId));
	}
	
	public getGameInstanceService(gameId: GameId, privateId: PrivateId): RefCounted<GameInstanceService> {
		let gameInstanceService = this.gameInstances.get(gameId);
		if (!gameInstanceService) {
			gameInstanceService = this.createGameInstanceService(gameId, privateId);
			this.gameInstances.set(gameId, gameInstanceService);
		}
		return gameInstanceService;
	}
	
	public removeGame(id: GameId): void {
		this.gameInstances.delete(id);
	}
}


export class GameInstanceService extends Closeable {
	private readonly wsSubject: WebSocketSubject<Object>;
	private readonly gameUpdate: Observable<GameJson>;
	private readonly error: Observable<WebsocketError>;
	
	constructor(
			private readonly gameService: GameService,
			private readonly backend: BackendService,
			private readonly gameId: GameId,
			private readonly privateId: PrivateId) {
		super()
		
		this.wsSubject = this.backend.webSocket(GAME_API_ROOT + SUBSCRIBE_PATH);
		const notifications: Observable<GameNotification> =
			this.wsSubject.pipe(filter(object => is(GameNotificationSchema, object)));
		
		this.gameUpdate = notifications.pipe(
			// Filter out errors. They can be caught by subscribing to the error
			// observable.
			catchError(err => NEVER),
			filter(notification => notification.type === "update"),
			map(update => update.state));
		
		this.error = notifications.pipe(
			filter(notification => notification.type === "error"),
			map(err => new WebsocketError(err.status, err.message)),
			catchError(err => {
				if (err instanceof CloseEvent) {
					return of(new WebsocketError(500, `Server unexpectedly closed the connection: ${err}`))
				} else {
					return of(new WebsocketError(0, `Unknown error occured: ${err}`));
				};
			}));
		
		// If the server closes the connection, close the websocket. This does
		// not handle unexpected closures like the server crashing.
		this.wsSubject.subscribe({
			complete: () => this.close(),
			error: err => undefined
		 });
		
		this.wsSubject.next({
			method: "subscribe",
			payload: {
				gameId: this.gameId,
				privateId: this.privateId,
			}
		} satisfies WebSocketRequest<SubscribeRequest>);
	}
	
	public submitGuess(guess: number): Observable<void> {
		return this.backend.postJson<SubmitGuessRequest, void>(GAME_API_ROOT + SUBMIT_GUESS_PATH, {
			gameId: this.gameId,
			requester: this.privateId,
			guess
		});
	}
	
	public submitBet(target: BetTarget, wager: number): Observable<void> {
		return this.backend.postJson<SubmitBetRequest, void>(GAME_API_ROOT + SUBMIT_BET_PATH, {
			gameId: this.gameId,
			requester: this.privateId,
			target,
			wager
		});
	}
	
	public withdrawBet(target: BetTarget): Observable<void> {
		return this.backend.postJson<WithdrawBetRequest, void>(GAME_API_ROOT + WITHDRAW_BET_PATH, {
			gameId: this.gameId,
			requester: this.privateId,
			target
		});
	}
	
	public endPhase(): Observable<void> {
		return this.backend.postJson<EndPhaseRequest, void>(GAME_API_ROOT + END_PHASE_PATH, {
			gameId: this.gameId,
			requester: this.privateId
		});
	}
	
	// Completes when the game ends. Errors if an error notification is received.
	public onGameUpdate(): Observable<GameJson> {
		return this.gameUpdate;
	}
	
	public onError(): Observable<WebsocketError> {
		return this.error;
	}
	
	public override doClose(): void {
		this.wsSubject.complete();
		this.gameService.removeGame(this.gameId);
	}
};
