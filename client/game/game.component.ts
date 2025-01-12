import { ChangeDetectionStrategy, Component, computed, effect, Signal } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";

import { GameInstanceService, GameService } from "./game.service.js";
import { type GameId } from "../../shared/game/game.interface.js";


@Component({
	selector: "app-game",
	imports: [MatButton, MatCardModule],
	templateUrl: "./game.component.html",
	styleUrl: "./game.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameComponent {
	counter: Signal<number>;
	
	private gameService: Signal<GameInstanceService>;
	
	constructor(gameService: GameService, titleService: Title, route: ActivatedRoute) {
		const params: Signal<ParamMap> = toSignal(route.paramMap, { requireSync: true });
		
		this.gameService = computed(() => gameService.getGameInstanceService(params().get("gameId")!));
		this.counter = computed(() => this.gameService().gameState().counter);
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.gameService().gameState().title));
	}
	
	onAddOne(): void {
		this.gameService().addOne();
	}
	
	onReset(): void {
		this.gameService().resetCounter();
	}
}
