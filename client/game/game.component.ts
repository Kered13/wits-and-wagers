import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { Subscription } from "rxjs";

import { GameInstanceService, GameService } from "./game.service.js";
import { GameState } from "../../shared/game/game.interface.js";


@Component({
	selector: "app-game",
	imports: [MatButton, MatCardModule],
	templateUrl: "./game.component.html",
	styleUrl: "./game.component.css"
})
export class GameComponent implements OnInit, OnDestroy{
	counter: number = 0;
	private counterSub: Subscription | undefined;
	private gameService: GameInstanceService;
	
	constructor(gameService: GameService) {
		this.gameService = gameService.getGameInstanceService("game1");
	}
	
	ngOnInit(): void {
		this.gameService.getGameState();
		this.counterSub = this.gameService.getGameUpdateListener()
			.subscribe((game: GameState) => {
				this.counter = game.counter;
			});
	}
	
	ngOnDestroy(): void {
		this.counterSub?.unsubscribe();
	}
	
	onAddOne(): void {
		this.gameService.addOne();
	}
	
	onReset(): void {
		this.gameService.resetCounter();
	}
}
