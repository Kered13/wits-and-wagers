import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, Subject } from "rxjs";

import { GameJson } from "../../shared/game/game.interface.js";


@Injectable({providedIn: "root"})
export class GameService {
	private game: GameJson = {counter: 0};
	private counterUpdated: Subject<GameJson> = new Subject<GameJson>();

	constructor(private http: HttpClient) { }
	
	getGameUpdateListener(): Observable<GameJson> {
		return this.counterUpdated.asObservable();
	}

	getGameState(): void {
		this.http.get<GameJson>("http://localhost:3000/api/state").subscribe(game => {
			console.log("got game state");
			this.counterUpdated.next(game);
		});
	}
	
	addOne(): void {
		this.http.post<GameJson>("http://localhost:3000/api/addone", {}).subscribe(game => {
			console.log("added one");
			this.counterUpdated.next(game);
		});
	}
	
	resetCounter(): void {
		this.http.post<GameJson>("http://localhost:3000/api/reset", {}).subscribe(game => {
			console.log("reset counter");
			this.counterUpdated.next(game);
		});
	}
}
