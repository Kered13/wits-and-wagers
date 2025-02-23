import { ChangeDetectionStrategy, Component, computed, effect, Inject, OnDestroy, Signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDialog } from "@angular/material/dialog";
import { MatInputModule } from "@angular/material/input";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { combineLatest, map, pairwise, startWith, Subscription, switchMap, take } from "rxjs";

import { GameInstanceService, GameService } from "./game.service.js";
import { GameEndDialogComponent } from "../game-end-dialog/game-end-dialog.component.js";
import { GlobalErrorHandler } from "../error-dialog/error-handler.js";
import { RoundEndDialogComponent } from "../round-end-dialog/round-end-dialog.component.js";
import { GameRoute, TypedRouteFor } from "../routes/routes.js";
import { RoutingService } from "../routes/routing.service.js";
import { RefCounted } from "../utils/refcounted.js";
import { PrivatePlayer } from "../../shared/player.js";
import { GameJson } from "../../shared/game/game.js";


@Component({
	selector: "app-game",
	imports: [FormsModule, MatButton, MatCardModule, MatInputModule],
	templateUrl: "./game.component.html",
	styleUrl: "./game.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameComponent implements OnDestroy {
	private readonly gameService: Signal<RefCounted<GameInstanceService>>;
	private readonly subs: Subscription[] = [];
	private readonly instanceSub: Subscription;
	
	readonly game: Signal<GameJson>;
	readonly tempGameString: Signal<string>;
	readonly thisPlayer: Signal<PrivatePlayer>;
	
	guess: string = ""
	target: string = ""
	wager: string = ""
	
	constructor(
			private readonly errorHandler: GlobalErrorHandler,
			private readonly routing: RoutingService,
			private readonly dialog: MatDialog,
			gameService: GameService,
			titleService: Title,
			@Inject(ActivatedRoute) route: TypedRouteFor<GameRoute>) {
		this.thisPlayer = toSignal(route.data.pipe(map(data => data.player)), { requireSync: true });
		
		const instanceService = combineLatest([route.params, route.data]).pipe(
			map(([params, data]) => gameService.getGameInstanceService(params.gameId, data.player.privateId)));
		this.instanceSub = instanceService.pipe(startWith(undefined), pairwise())
			.subscribe(([oldService, newService]) => this.onNewGame(newService!, oldService));
		
		this.gameService = toSignal(instanceService, { requireSync: true });
		this.game = toSignal(
			instanceService.pipe(switchMap(service => service.get().onGameUpdate())),
			{
				initialValue: {
					title: "",
					players: [],
					round: 0,
					phase: {
						phase: "question",
						question: "",
						guesses: {}
					}
				}
			});
		this.tempGameString = computed(() => JSON.stringify(this.game(), null, 2));
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.game().title));
	}
	
	private onNewGame(newService: RefCounted<GameInstanceService>, oldService?: RefCounted<GameInstanceService>): void {
		if (oldService) {
			this.closeGameService(oldService);
		}
		
		newService.acquire();
		
		// Set up the handlers for game end and errors.
		this.subs.push(
			newService.get().onGameUpdate().subscribe({
				complete: () => {
					this.dialog.afterAllClosed.pipe(take(1)).subscribe(() => 
						this.dialog.open(GameEndDialogComponent, { data: this.game() }));
				}
			}),
			newService.get().onEndRound().subscribe(endRound => {
				this.dialog.open(RoundEndDialogComponent, {
					data: {
						endRound,
						players: this.game().players
					}
				});
			}),
			newService.get().onError().subscribe(err => {
				this.errorHandler.handleError(err)
					.subscribe(_ => this.routing.toHome());
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
	
	public onSubmitGuess(): void {
		const guess = parseInt(this.guess);
		this.gameService().get().submitGuess(guess).subscribe();
	}
	
	public onSubmitBet(): void {
		const target =
			this.target === "AllTooHigh" || this.target === "Red" || this.target === "Black"
				? this.target
				: parseInt(this.target);
		
		const wager = parseInt(this.wager);
		this.gameService().get().submitBet(target, wager).subscribe();
	}
	
	public onWithdrawBet(): void {
		const target =
			this.target === "AllTooHigh" || this.target === "Red" || this.target === "Black"
				? this.target
				: parseInt(this.target);
		this.gameService().get().withdrawBet(target).subscribe();
	}
	
	public onEndPhase(): void {
		this.gameService().get().endPhase().subscribe();
	}
}
