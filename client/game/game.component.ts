import { ChangeDetectionStrategy, Component, computed, effect, Signal } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";

import { GameInstanceService, GameService } from "./game.service.js";
import { PrivatePlayer } from "../../shared/player.js";
import { GameJson, GamePlayerJson } from "../../shared/game/game.js";


@Component({
	selector: "app-game",
	imports: [MatButton, MatCardModule],
	templateUrl: "./game.component.html",
	styleUrl: "./game.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameComponent {
	private readonly gameService: Signal<GameInstanceService>;
	
	readonly game: Signal<GameJson>;
	readonly thisPlayer: Signal<PrivatePlayer>;
	
	constructor(gameService: GameService, titleService: Title, route: ActivatedRoute, router: Router) {
		const data = toSignal(route.data, { requireSync: true });
		this.thisPlayer = computed(() => ({
			name: data().username,
			publicId: data().publicId,
			privateId: data().privateId
		}));

		const params: Signal<ParamMap> = toSignal(route.paramMap, { requireSync: true });
		this.gameService = computed(() => gameService.getGameInstanceService(params().get("gameId")!));
		this.game = computed(() => this.gameService().gameState());
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.game().title));
	}
	
	onAddOne(): void {
		this.gameService().addOne(this.thisPlayer());
	}
	
	onReset(): void {
		this.gameService().resetCounter(this.thisPlayer());
	}
}
