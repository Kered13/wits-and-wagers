import { Component, computed, OnDestroy, OnInit, Signal } from "@angular/core";
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
export class GameComponent {
	counter: Signal<number>;
	private gameService: GameInstanceService;
	
	constructor(gameService: GameService) {
		this.gameService = gameService.getGameInstanceService("game1");
		this.counter = computed(() => this.gameService.gameState().counter);
	}
	
	onAddOne(): void {
		this.gameService.addOne();
	}
	
	onReset(): void {
		this.gameService.resetCounter();
	}
}
