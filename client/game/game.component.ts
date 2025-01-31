import { ChangeDetectionStrategy, Component, computed, effect, Inject, OnDestroy, Signal } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { map, pairwise, startWith, Subscription, switchMap } from "rxjs";

import { GameInstanceService, GameService } from "./game.service.js";
import { GameRoute, HOME_ROUTE, TypedRouteFor } from "../routes/routes.js";
import { PrivatePlayer } from "../../shared/player.js";
import { GameJson } from "../../shared/game/game.js";
import { RefCounted } from "../utils/refcounted.js";


@Component({
	selector: "app-game",
	imports: [MatButton, MatCardModule],
	templateUrl: "./game.component.html",
	styleUrl: "./game.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameComponent implements OnDestroy {
	private readonly gameService: Signal<RefCounted<GameInstanceService>>;
	private readonly subs: Subscription[] = [];
	private readonly instanceSub: Subscription;
	
	readonly game: Signal<GameJson>;
	readonly thisPlayer: Signal<PrivatePlayer>;
	
	constructor(
			private readonly router: Router,
			gameService: GameService,
			titleService: Title,
			@Inject(ActivatedRoute) route: TypedRouteFor<GameRoute>) {
		const data = toSignal(route.data, { requireSync: true });
		this.thisPlayer = computed(() => ({
			name: data().username,
			publicId: data().publicId,
			privateId: data().privateId
		}));
		
		const instanceService = route.params.pipe(
			map(params => gameService.getGameInstanceService(params.gameId)));
		this.instanceSub = instanceService.pipe(startWith(undefined), pairwise())
			.subscribe(([oldService, newService]) => this.onNewLobby(newService!, oldService));
		
		this.gameService = toSignal(instanceService, { requireSync: true });
		this.game = toSignal(
			instanceService.pipe(switchMap(service => service.get().onGameUpdate())),
			{ initialValue: { title: "", players: [] }});
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.game().title));
	}
	
	private onNewLobby(newService: RefCounted<GameInstanceService>, oldService?: RefCounted<GameInstanceService>): void {
		if (oldService) {
			this.closeGameService(oldService);
		}
		
		newService.acquire();
		this.subs.push(
			newService.get().onError().subscribe(err => {
				console.error(`WebSocket returned status ${err.status}: ${err.message}`);
				this.router.navigate(HOME_ROUTE.url());
			}));
	}
	
	private closeGameService(service: RefCounted<GameInstanceService>): void {
		service.release();
		this.subs.forEach(sub => sub.unsubscribe());
		this.subs.length = 0;
	}
	
	public ngOnDestroy(): void {
		this.closeGameService(this.gameService());
		this.instanceSub.unsubscribe();
	}
	
	onAddOne(): void {
		this.gameService().get().addOne(this.thisPlayer());
	}
	
	onReset(): void {
		this.gameService().get().resetCounter(this.thisPlayer());
	}
}
