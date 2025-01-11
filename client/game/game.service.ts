import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable, signal, Signal, WritableSignal } from "@angular/core";
import { Observable, map, filter } from "rxjs";
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import { GameId, GameState } from "../../shared/game/game.interface.js";
import { GameEnd, GameNotification } from "../../shared/game/update.interface.js";


@Injectable({providedIn: "root"})
export class GameService {
	private gameInstances: Map<GameId, GameInstanceService> = new Map<GameId, GameInstanceService>();
	
	constructor(private http: HttpClient) {}
	
	private createGameInstanceService(id: GameId): GameInstanceService {
		return new GameInstanceService(this.http, id);
	}
	
	getGameInstanceService(id: GameId): GameInstanceService {
		if (this.gameInstances.has(id)) {
			return this.gameInstances.get(id)!;
		}
		
		const gameInstanceService = this.createGameInstanceService(id);
		this.gameInstances.set(id, gameInstanceService);
		return gameInstanceService;
	}
}


export class GameInstanceService {
	public readonly gameState: Signal<GameState>;
	
	private gameUpdates: WritableSignal<GameState>;
	private gameEnd: Observable<GameEnd>;
	
	constructor(private http: HttpClient, private id: GameId) {
		const wsSubject: WebSocketSubject<Object> = webSocket("ws://localhost:3000/api/state");
		wsSubject.next(this.id);
		
		const notifications: Observable<GameNotification> =
			wsSubject.pipe(
				filter(object => "type" in object),
				map(object => object as GameNotification));
		
		this.gameUpdates = signal({ counter: 0 });
		notifications
			.pipe(filter(notification => notification.type === "update"),
			      map(update => update.state))
			.subscribe(state => this.gameUpdates.set(state));
		
		this.gameEnd = notifications.pipe(filter(notification => notification.type === "end"));
		this.gameState = this.gameUpdates;
		
		// Immediately fetch the current game state.
		this.http.get<GameState>("http://localhost:3000/api/state", { params: { id: this.id }}).subscribe(game => {
			this.gameUpdates.set(game);
		});
	}
	
	getGameEndObservable(): Observable<GameEnd> {
		return this.gameEnd;
	}
	
	addOne(): void {
		const headers: HttpHeaders = new HttpHeaders().set("Content-Type", "application/json");
		this.http.post("http://localhost:3000/api/addone", JSON.stringify(this.id), { headers: headers }).subscribe();
	}
	
	resetCounter(): void {
		const headers: HttpHeaders = new HttpHeaders().set("Content-Type", "application/json");
		this.http.post("http://localhost:3000/api/reset", JSON.stringify(this.id), { headers: headers }).subscribe();
	}
};
