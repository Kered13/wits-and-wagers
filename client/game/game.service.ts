import { Injectable } from "@angular/core";
import { Observable, map, filter } from "rxjs";
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { is } from "valibot";

import { BackendService } from "../utils/backend.service.js";
import { Closeable, RefCounted } from "../utils/refcounted.js";
import { type GameId, type GameJson } from "../../shared/game/game.js";
import { type GameEnd, GameNotificationSchema, type GameNotification } from "../../shared/game/notifications.js";
import { SubscribeRequest } from "../../shared/game/subscribe.js";
import { PrivateId } from "../../shared/player.js";
import { WebsocketError } from "../utils/websocket-error.js";


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
	private readonly gameEnd: Observable<GameEnd>;
	private readonly error: Observable<WebsocketError>;
	
	constructor(
			private readonly gameService: GameService,
			private readonly backend: BackendService,
			private readonly gameId: GameId,
			private readonly privateId: PrivateId) {
		super()
		
		this.wsSubject = webSocket("ws://localhost:3000/api/game/state");
		this.wsSubject.next({
			method: "subscribe",
			payload: {
				gameId: this.gameId,
				privateId: this.privateId,
			} satisfies SubscribeRequest
		});
		
		const notifications: Observable<GameNotification> =
			this.wsSubject.pipe(filter(object => is(GameNotificationSchema, object)));
		
		this.gameUpdate = notifications.pipe(
			filter(notification => notification.type === "update"),
			map(update => update.state));
		
		this.gameEnd = notifications.pipe(
			filter(notification => notification.type === "end"));
		
		this.error = notifications.pipe(
			filter(notification => notification.type === "error"),
			map(err => new WebsocketError(err.status, err.message)));
		
		// If the server closes the connection, close this lobby. This does not
		// handle unexpected closures like the server crashing.
		this.wsSubject.subscribe({ complete: () => this.close() });
	}
	
	public onGameUpdate(): Observable<GameJson> {
		return this.gameUpdate;
	}
	
	public onGameEnd(): Observable<GameEnd> {
		return this.gameEnd;
	}
	
	public onError(): Observable<WebsocketError> {
		return this.error;
	}
	
	public override doClose(): void {
		this.wsSubject.complete();
		this.gameService.removeGame(this.gameId);
	}
};
