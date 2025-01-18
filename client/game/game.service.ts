import { Injectable, signal, Signal, WritableSignal } from "@angular/core";
import { Observable, map, filter } from "rxjs";
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { assert, is } from "valibot";

import { BackendService } from "../utils/backend.service.js";
import { CreateGameRequestSchema, type CreateGameRequest, type CreateGameResponse } from "../../shared/game/create.js";
import { AddOneRequest, ResetRequest, type GameId, type GameJson } from "../../shared/game/game.js";
import { type GameEnd, GameNotificationSchema, type GameNotification } from "../../shared/game/update.js";
import { PrivateId, PrivatePlayer } from "../../shared/player.js";


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
	
	createGame(request: CreateGameRequest): Observable<CreateGameResponse> {
		assert(CreateGameRequestSchema, request);
		return this.http.postJson<CreateGameRequest, CreateGameResponse>("/api/game/create", request);
	}
}


export class GameInstanceService {
	public readonly gameState: Signal<GameJson>;
	
	private readonly gameUpdates: WritableSignal<GameJson>;
	private readonly gameEnd: Observable<GameEnd>;
	
	constructor(private backend: BackendService, private id: GameId) {
		const wsSubject: WebSocketSubject<Object> = webSocket("ws://localhost:3000/api/game/state");
		wsSubject.next({
			method: "register",
			payload: this.id
		});
		
		const notifications: Observable<GameNotification> =
			wsSubject.pipe(filter(object => is(GameNotificationSchema, object)));
		
		this.gameUpdates = signal({ title: "", players: [] });
		notifications
			.pipe(filter(notification => notification.type === "update"),
			      map(update => update.state))
			.subscribe(state => this.gameUpdates.set(state));
		
		this.gameEnd = notifications.pipe(filter(notification => notification.type === "end"));
		this.gameState = this.gameUpdates;
	}
	
	public getGameEndObservable(): Observable<GameEnd> {
		return this.gameEnd;
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
};
