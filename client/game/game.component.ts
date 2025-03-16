import { ChangeDetectionStrategy, Component, computed, Directive, effect, Inject, Input, OnDestroy, Signal, viewChild } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { AbstractControl, FormsModule, NG_VALIDATORS, NgModel, ValidationErrors, Validator } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDialog } from "@angular/material/dialog";
import { MatError, MatInputModule } from "@angular/material/input";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { parseIntSafe } from "complete-common";
import { combineLatest, concat, delay, map, type Observable, of, pairwise, startWith, Subscription, switchMap, take } from "rxjs";

import { GameInstanceService, GameService } from "./game.service.js";
import { GameEndDialogComponent } from "../game-end-dialog/game-end-dialog.component.js";
import { GlobalErrorHandler } from "../error-dialog/error-handler.js";
import { RoundEndDialogComponent } from "../round-end-dialog/round-end-dialog.component.js";
import { GameRoute, TypedRouteFor } from "../routes/routes.js";
import { RoutingService } from "../routes/routing.service.js";
import { RefCounted } from "../utils/refcounted.js";
import { PrivatePlayer } from "../../shared/player.js";
import { BettingPhaseState } from "../../shared/game/betting-phase.js";
import { GameOverPhaseState, GameState } from "../../shared/game/game.js";
import { QuestionPhaseState } from "../../shared/game/question-phase.js";


@Directive({
	selector: "[targetValidator]",
	providers: [{ provide: NG_VALIDATORS, useExisting: TargetValidator, multi: true }]
})
export class TargetValidator implements Validator {
	@Input({ alias: "targetValidator" }) numGuesses = 0;
	
	public validate(control: AbstractControl): ValidationErrors | null {
		if (control.value === "AllTooHigh" || control.value === "Red" || control.value === "Black") {
			return null;
		}
		const value = parseIntSafe(control.value);
		if (value === undefined || value < 0 || value >= this.numGuesses) {
			return { "invalidTarget": true };
		}
		return null;
	}
}


@Directive({
	selector: "[guessValidator]",
	providers: [{ provide: NG_VALIDATORS, useExisting: GuessValidator, multi: true }]
})
export class GuessValidator implements Validator {
	public validate(control: AbstractControl): ValidationErrors | null {
		const value = parseIntSafe(control.value);
		if (value === undefined) {
			return { "notAnInteger": true };
		} else if (value <= 0) {
			return { "mustBePositive": true };
		}
		return null;
	}
}


@Directive({
	selector: "[chipValidator]",
	providers: [{ provide: NG_VALIDATORS, useExisting: ChipValidator, multi: true }]
})
export class ChipValidator {
	@Input({ alias: "chipValidator" }) availableChips = 0;
	
	public validate(control: AbstractControl): ValidationErrors | null {
		const value = parseIntSafe(control.value);
		if (!value) {
			return { "notAnInteger": true };
		} else if (value < 0) {
			return { "mustBePositive": true };
		} else if (value > this.availableChips) {
			return { "insufficientChips": true };
		}
		return null;
	}
}


type PhaseState = QuestionPhaseState | BettingPhaseState | GameOverPhaseState;


@Component({
	selector: "app-game",
	imports: [
		ChipValidator,
		FormsModule,
		GuessValidator,
		MatButton,
		MatCardModule,
		MatError,
		MatInputModule,
		TargetValidator
	],
	templateUrl: "./game.component.html",
	styleUrl: "./game.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameComponent implements OnDestroy {
	private readonly gameService: Signal<RefCounted<GameInstanceService>>;
	private readonly subs: Subscription[] = [];
	private readonly instanceSub: Subscription;
	
	readonly game: Signal<GameState>;
	readonly tempGameString: Signal<string>;
	readonly thisPlayer: Signal<PrivatePlayer>;
	readonly availableChips: Signal<number>;
	readonly roundTimer: Signal<number | undefined>;
	readonly guessField: Signal<NgModel | undefined> = viewChild("guessField");
	readonly targetField: Signal<NgModel | undefined> = viewChild("targetField");
	readonly wagerField: Signal<NgModel | undefined> = viewChild("wagerField");
	
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
		
		const gameObs = instanceService.pipe(switchMap(service => service.get().onGameUpdate()));
		
		this.gameService = toSignal(instanceService, { requireSync: true });
		this.game = toSignal(gameObs, {
			initialValue: {
				title: "",
				host: "",
				players: [],
				round: 0,
				phase: {
					phase: "question",
					question: "",
					guesses: {}
				}
			}
		});
		this.availableChips = computed(() => {
			const player = this.game().players.find(player => player.publicId === this.thisPlayer().publicId);
			return player?.chips ?? 0;
		});
		
		this.roundTimer = toSignal(
			gameObs.pipe(switchMap(game => this.startRoundTimer(game.phase))),
			{ initialValue: undefined });
		
		this.tempGameString = computed(() => JSON.stringify(this.game(), null, 2));
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.game().title));
	}
	
	public isQuestionPhase(phase: PhaseState): phase is QuestionPhaseState {
		return phase.phase === "question";
	}
	
	public isBettingPhase(phase: PhaseState): phase is BettingPhaseState {
		return phase.phase === "betting";
	}
	
	public isGameOverPhase(phase: PhaseState): phase is GameOverPhaseState {
		return phase.phase === "game-over";
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
	
	// Returns an observable that emits the remaining time in seconds until the
	// round ends, or undefined if there is no time limit on the round.
	private startRoundTimer(phase: PhaseState): Observable<number | undefined> {
		if (this.isGameOverPhase(phase) || !phase.roundEnd || !phase.roundDuration) {
			return of(undefined);
		}
		const duration = phase.roundDuration;
		const end = phase.roundEnd;
		const now = Date.now();
		const timers: Observable<number>[] = [];
		for (let t = 0; t <= duration && end - t > now; t += 1000) {
			timers.push(of(Math.round(t / 1000)).pipe(delay(new Date(end - t))));
		}
		timers.reverse();
		return concat(of(Math.round(duration / 1000)), ...timers);
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
		const guess = parseIntSafe(this.guess)!;
		this.gameService().get().submitGuess(guess).subscribe();
	}
	
	public onSubmitBet(): void {
		const target =
			this.target === "AllTooHigh" || this.target === "Red" || this.target === "Black"
				? this.target
				: parseInt(this.target)!;
		
		const wager = parseInt(this.wager)!;
		this.gameService().get().submitBet(target, wager).subscribe();
	}
	
	public onWithdrawBet(): void {
		const target =
			this.target === "AllTooHigh" || this.target === "Red" || this.target === "Black"
				? this.target
				: parseInt(this.target)!;
		this.gameService().get().withdrawBet(target).subscribe();
	}
	
	public onEndPhase(): void {
		this.gameService().get().endPhase().subscribe();
	}
}
