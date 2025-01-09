import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, map, filter } from "rxjs";
import { webSocket, type WebSocketSubject } from 'rxjs/webSocket';

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
	private gameUpdates: BehaviorSubject<GameState>;
	private gameEnd: Observable<GameEnd>;
	
	constructor(private http: HttpClient, private id: GameId) {
		const wsSubject = webSocket<GameNotification>("ws://localhost:3000/api/state");

		this.gameUpdates = new BehaviorSubject<GameState>({ counter: 0 });
		this.gameEnd = wsSubject.pipe(filter(notification => notification.type === "end"));
		
		wsSubject
			.pipe(filter(notification => notification.type === "update"),
			      map(update => update.state))
			.subscribe(this.gameUpdates);
	}
	
	getGameUpdateListener(): Observable<GameState> {
		return this.gameUpdates.asObservable();
	}
	
	getGameEndListener(): Observable<GameEnd> {
		return this.gameEnd;
	}

	getGameState(): void {
		this.http.get<GameState>("http://localhost:3000/api/state", { params: { id: this.id }}).subscribe(game => {
			this.gameUpdates.next(game);
		});
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
