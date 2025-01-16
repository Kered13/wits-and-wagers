import { Injectable, signal, Signal, WritableSignal } from "@angular/core";
import { Observable, map, filter } from "rxjs";
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { assert, is } from "valibot";

import { HttpService } from "../utils/http.service.js";
import { CreateGameRequestSchema, type CreateGameRequest, type CreateGameResponse } from "../../shared/game/create.js";
import { type GameId, type GameJson } from "../../shared/game/game.js";
import { type GameEnd, GameNotificationSchema, type GameNotification } from "../../shared/game/update.js";


@Injectable({providedIn: "root"})
export class GameService {
	private gameInstances: Map<GameId, GameInstanceService> = new Map<GameId, GameInstanceService>();
	
	constructor(private http: HttpService) {}
	
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
		return this.http.postJson<CreateGameResponse>("http://localhost:3000/api/game/create", request);
	}
}


export class GameInstanceService {
	public readonly gameState: Signal<GameJson>;
	
	private readonly gameUpdates: WritableSignal<GameJson>;
	private readonly gameEnd: Observable<GameEnd>;
	
	constructor(private http: HttpService, private id: GameId) {
		const wsSubject: WebSocketSubject<Object> = webSocket("ws://localhost:3000/api/game/state");
		wsSubject.next({
			method: "register",
			payload: this.id
		});
		
		const notifications: Observable<GameNotification> =
			wsSubject.pipe(filter(object => is(GameNotificationSchema, object)));
		
		this.gameUpdates = signal({ title: "", counter: 0 });
		notifications
			.pipe(filter(notification => notification.type === "update"),
			      map(update => update.state))
			.subscribe(state => this.gameUpdates.set(state));
		
		this.gameEnd = notifications.pipe(filter(notification => notification.type === "end"));
		this.gameState = this.gameUpdates;
		
		// Immediately fetch the current game state.
		this.http.get<GameJson>("http://localhost:3000/api/game/state", { id: this.id }).subscribe(game => {
			this.gameUpdates.set(game);
		});
	}
	
	public getGameEndObservable(): Observable<GameEnd> {
		return this.gameEnd;
	}
	
	public addOne(): void {
		this.http.postJson("http://localhost:3000/api/game/addone", this.id).subscribe();
	}
	
	public resetCounter(): void {
		this.http.postJson("http://localhost:3000/api/game/reset", this.id).subscribe();
	}
};
