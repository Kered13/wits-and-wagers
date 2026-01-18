import { Injectable } from "@angular/core";
import { Observable, map, filter, catchError, of, NEVER, Subject } from "rxjs";
import { safeParse } from "valibot";

import { BackendService } from "../utils/backend.service.js";
import { RefCounted } from "../utils/refcounted.js";
import { WebsocketError } from "../utils/websocket-error.js";
import { WebsocketService } from "../utils/websocket.service.js";
import { BetTarget } from "../../shared/game/betting-phase.js";
import { END_PHASE_PATH, EndPhaseRequest } from "../../shared/game/end-phase.js";
import { GAME_API_ROOT, type GameId, type GameState } from "../../shared/game/game.js";
import { JOIN_SPECTATOR_PATH, type JoinGameRequest, type JoinGameResponse } from "../../shared/game/join-game.js";
import { GameNotificationSchema, type GameNotification } from "../../shared/game/notifications.js";
import { SUBMIT_BET_PATH, SubmitBetRequest } from "../../shared/game/submit-bet.js";
import { GuessOrWithdraw, SUBMIT_GUESS_PATH, SubmitGuessRequest } from "../../shared/game/submit-guess.js";
import { SUBSCRIBE_PATH, SubscribeRequest } from "../../shared/game/subscribe.js";
import { PrivateId } from "../../shared/player.js";
import { type WebSocketRequest } from "../../shared/websocket.interface.js";


@Injectable({providedIn: "root"})
export class GameService {
	private gameInstances = new Map<GameId, RefCounted<GameInstanceService>>();
	
	constructor(private backend: BackendService) {}
	
	private createGameInstanceService(gameId: GameId, privateId: PrivateId): RefCounted<GameInstanceService> {
		return new RefCounted<GameInstanceService>(new GameInstanceService(this, this.backend, gameId, privateId));
	}
	
	public getGameInstanceService(gameId: GameId, privateId: PrivateId): RefCounted<GameInstanceService> {
		let gameInstanceService = this.gameInstances.get(gameId);
		if (!gameInstanceService) {
			gameInstanceService = this.createGameInstanceService(gameId, privateId);
			this.gameInstances.set(gameId, gameInstanceService);
		}
		return gameInstanceService;
	}
	
	public joinGame(gameId: GameId, name: string, privateId?: PrivateId): Observable<JoinGameResponse> {
		return this.backend.postJson<JoinGameRequest, JoinGameResponse>(
			GAME_API_ROOT + JOIN_SPECTATOR_PATH, { gameId, name, privateId });
	}
	
	public removeGame(id: GameId): void {
		this.gameInstances.delete(id);
	}
}


export class GameInstanceService extends WebsocketService {
	private readonly gameUpdate: Observable<GameState>;
	private readonly error: Observable<WebsocketError>;
	
	constructor(
			private readonly gameService: GameService,
			backend: BackendService,
			private readonly gameId: GameId,
			private readonly privateId: PrivateId) {
		super(GAME_API_ROOT + SUBSCRIBE_PATH, backend);
		
		const notifications = new Subject<GameNotification>();
		this.retryWsSubject.pipe(
				map(object => safeParse(GameNotificationSchema, object)),
				filter(parsed => parsed.success),
				map(parsed => parsed.output))
			.subscribe(notifications);
		
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
					// TODO: Attempt reconnection?
					return of(new WebsocketError(500, `Server unexpectedly closed the connection: ${err.reason}`))
				} else {
					return of(new WebsocketError(0, `Unknown error occured: ${err} | ${err.toString()} | ${JSON.stringify(err)}`));
				};
			}));
		
		// If the server closes the connection, close the websocket. This does
		// not handle unexpected closures like the server crashing.
		notifications.subscribe({
			complete: () => this.close()
		});
	}
	
	protected override onOpen(event: Event): void {
		this.wsSubject.next({
			method: "subscribe",
			payload: {
				gameId: this.gameId,
				privateId: this.privateId,
			},
		} satisfies WebSocketRequest<SubscribeRequest>);
	}
	
	protected override onClose(): void {
		this.gameService.removeGame(this.gameId);
	}
	
	public submitGuess(guess: GuessOrWithdraw): Observable<void> {
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
	
	public endPhase(): Observable<void> {
		return this.backend.postJson<EndPhaseRequest, void>(GAME_API_ROOT + END_PHASE_PATH, {
			gameId: this.gameId,
			requester: this.privateId
		});
	}
	
	// Completes when the game ends. Will not error.
	public onGameUpdate(): Observable<GameState> {
		return this.gameUpdate;
	}
	
	// Notifies on any errors in the notification stream.
	public onError(): Observable<WebsocketError> {
		return this.error;
	}
};
