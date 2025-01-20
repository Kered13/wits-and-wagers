import { Injectable } from "@angular/core";
import { Observable, map, filter } from "rxjs";
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { is } from "valibot";

import { BackendService } from "../utils/backend.service.js";
import { AddOneRequest, ResetRequest, type GameId, type GameJson } from "../../shared/game/game.js";
import { type GameEnd, GameNotificationSchema, type GameNotification } from "../../shared/game/update.js";
import { PrivatePlayer } from "../../shared/player.js";


@Injectable({providedIn: "root"})
export class GameService {
	private gameInstances: Map<GameId, GameInstanceService> = new Map<GameId, GameInstanceService>();
	
	constructor(private http: BackendService) {}
	
	private createGameInstanceService(id: GameId): GameInstanceService {
		return new GameInstanceService(this.http, id);
	}
	
	getGameInstanceService(id: GameId): GameInstanceService {
		let gameInstanceService = this.gameInstances.get(id);
		if (!gameInstanceService) {
			gameInstanceService = this.createGameInstanceService(id);
			this.gameInstances.set(id, gameInstanceService);
		}
		return gameInstanceService;
	}
}


export class GameInstanceService {
	private readonly gameUpdate: Observable<GameJson>;
	private readonly gameEnd: Observable<GameEnd>;
	
	constructor(private backend: BackendService, private id: GameId) {
		const wsSubject: WebSocketSubject<Object> = webSocket("ws://localhost:3000/api/game/state");
		wsSubject.next({
			method: "register",
			payload: this.id
		});
		
		const notifications: Observable<GameNotification> =
			wsSubject.pipe(filter(object => is(GameNotificationSchema, object)));
		
		this.gameUpdate = notifications.pipe(
				filter(notification => notification.type === "update"),
				map(update => update.state));
		
		this.gameEnd = notifications.pipe(filter(notification => notification.type === "end"));
	}
	
	public addOne(player: PrivatePlayer): void {
		this.backend.postJson<AddOneRequest, void>("/api/game/addone", {
				gameId: this.id,
				privateId: player.privateId })
			.subscribe();
	}
	
	public resetCounter(player: PrivatePlayer): void {
		this.backend.postJson<ResetRequest, void>("/api/game/reset", {
				gameId: this.id,
				privateId: player.privateId })
			.subscribe();
	}
	
	public onGameUpdate(): Observable<GameJson> {
		return this.gameUpdate;
	}
	
	public onGameEnd(): Observable<GameEnd> {
		return this.gameEnd;
	}
};
