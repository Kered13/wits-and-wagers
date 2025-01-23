import { ChangeDetectionStrategy, Component, computed, effect, Inject, Signal } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";

import { GameInstanceService, GameService } from "./game.service.js";
import { PrivatePlayer } from "../../shared/player.js";
import { GameJson } from "../../shared/game/game.js";
import { map, switchMap } from "rxjs";
import { GameRoute, TypedRouteFor } from "../routes/routes.js";


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
	
	constructor(
			gameService: GameService,
			titleService: Title,
			@Inject(ActivatedRoute) route: TypedRouteFor<GameRoute>) {
		const data = toSignal(route.data, { requireSync: true });
		this.thisPlayer = computed(() => ({
			name: data().username,
			publicId: data().publicId,
			privateId: data().privateId
		}));
		
		const instanceService = route.paramMap.pipe(
			map(params => gameService.getGameInstanceService(params.get("gameId")!)));
		
		this.gameService = toSignal(instanceService, { requireSync: true });
		this.game = toSignal(
			instanceService.pipe(switchMap(service => service.onGameUpdate())),
			{ initialValue: { title: "", players: [] }});
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.game().title));
	}
	
	onAddOne(): void {
		this.gameService().addOne(this.thisPlayer());
	}
	
	onReset(): void {
		this.gameService().resetCounter(this.thisPlayer());
	}
}
