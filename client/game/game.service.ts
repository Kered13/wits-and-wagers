import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, map } from "rxjs";
import { webSocket, type WebSocketSubject } from 'rxjs/webSocket';

import { GameJson } from "../../shared/game/game.interface.js";


@Injectable({providedIn: "root"})
export class GameService {
	private gameUpdated: BehaviorSubject<GameJson> = new BehaviorSubject<GameJson>({counter: 0});
	private wsSubject: WebSocketSubject<GameJson> = webSocket("ws://localhost:3000/api/state");

	constructor(private http: HttpClient) {
		this.wsSubject.subscribe(this.gameUpdated);
	}
	
	getGameUpdateListener(): Observable<GameJson> {
		return this.gameUpdated.asObservable();
	}

	getGameState(): void {
		this.http.get<GameJson>("http://localhost:3000/api/state").subscribe(game => {
			console.log("got game state");
			this.gameUpdated.next(game);
		});
	}
	
	addOne(): void {
		this.http.post<GameJson>("http://localhost:3000/api/addone", {}).subscribe(game => {
			console.log("added one");
			this.gameUpdated.next(game);
		});
	}
	
	resetCounter(): void {
		this.http.post<GameJson>("http://localhost:3000/api/reset", {}).subscribe(game => {
			console.log("reset counter");
			this.gameUpdated.next(game);
		});
	}
}
