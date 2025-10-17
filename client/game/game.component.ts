import { ChangeDetectionStrategy, Component, computed, Directive, effect, Inject, input, Input, OnDestroy, Signal, viewChild } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { AbstractControl, FormsModule, NG_VALIDATORS, NgModel, ValidationErrors, Validator } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { MatError, MatInputModule } from "@angular/material/input";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { parseIntSafe } from "complete-common";
import { combineLatest, concat, delay, map, type Observable, of, pairwise, startWith, Subscription, switchMap, take } from "rxjs";

import { AllTooHighBox } from "./wager-box/all-too-high-box.component.js";
import { BettingBox } from "./wager-box/wager-box.component.js";
import { ColorWagerBox } from "./wager-box/color-wager-box.component.js";
import { WagerDialog } from "./wager-dialog/wager-dialog.component.js";
import { GameInstanceService, GameService } from "./game.service.js";
import { GameEndDialogComponent } from "../game-end-dialog/game-end-dialog.component.js";
import { GlobalErrorHandler } from "../error-dialog/error-handler.js";
import { RoundEndDialogComponent } from "../round-end-dialog/round-end-dialog.component.js";
import { GameRoute, TypedRouteFor } from "../routes/routes.js";
import { RoutingService } from "../routes/routing.service.js";
import { RefCounted } from "../utils/refcounted.js";
import { PrivatePlayer } from "../../shared/player.js";
import { BetTarget, BettingPhaseState } from "../../shared/game/betting-phase.js";
import { GameOverPhaseState, GamePlayer, GameState } from "../../shared/game/game.js";
import { QuestionPhaseState } from "../../shared/game/question-phase.js";
import { IntermissionPhaseState } from "../../shared/game/intermission-phase.js";
import { BLACK, GRAY, GREEN, ORANGE, PURPLE, RED, YELLOW } from "../../shared/color.js";


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
	readonly availableChips = input.required<number>({ alias: "chipValidator" });
	
	public validate(control: AbstractControl): ValidationErrors | null {
		const value = parseIntSafe(control.value);
		if (!value) {
			return { "notAnInteger": true };
		} else if (value < 0) {
			return { "mustBePositive": true };
		} else if (value > this.availableChips()) {
			return { "insufficientChips": true };
		}
		return null;
	}
}


type PhaseState = QuestionPhaseState
	| BettingPhaseState
	| IntermissionPhaseState
	| GameOverPhaseState;


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
		TargetValidator,
		AllTooHighBox,
		BettingBox,
		ColorWagerBox,
	],
	templateUrl: "./game.component.html",
	styleUrl: "./game.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameComponent implements OnDestroy {
	private readonly gameService: Signal<RefCounted<GameInstanceService>>;
	private readonly subs: Subscription[] = [];
	private readonly instanceSub: Subscription;
	private intermissionDialog: MatDialogRef<RoundEndDialogComponent> | undefined = undefined;
	
	readonly game: Signal<GameState>;
	readonly tempGameString: Signal<string>;
	readonly thisParticipant: Signal<PrivatePlayer>;
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
		this.thisParticipant = toSignal(route.data.pipe(map(data => data.player)), { requireSync: true });
		
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
				spectators: [],
				round: 0,
				phase: {
					phase: "question",
					question: "",
					guesses: {}
				}
			}
		});
		this.availableChips = computed(() => {
			const player = this.game().players.find(player => player.publicId === this.thisParticipant().publicId) ||
				this.game().spectators.find(spectator => spectator.publicId === this.thisParticipant().publicId);
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
	
	public isIntermissionPhase(phase: PhaseState): phase is IntermissionPhaseState {
		return phase.phase === "intermission";
	}
	
	public isGameOverPhase(phase: PhaseState): phase is GameOverPhaseState {
		return phase.phase === "game-over";
	}
	
	public isParticipantPlayer(players: GamePlayer[], participant: PrivatePlayer): boolean {
		return players.some(player => player.publicId === participant.publicId);
	}
	
	private onNewGame(newService: RefCounted<GameInstanceService>, oldService?: RefCounted<GameInstanceService>): void {
		if (oldService) {
			this.closeGameService(oldService);
		}
		
		newService.acquire();
		
		// Set up the handlers for game update, game end, and errors.
		this.subs.push(
			newService.get().onGameUpdate().subscribe({
				next: state => {
					this.onGameUpdate(state);
				},
				complete: () => {
					this.dialog.afterAllClosed.pipe(take(1)).subscribe(() => 
						this.dialog.open(GameEndDialogComponent, { data: this.game() }));
				}
			}),
			newService.get().onError().subscribe(err => {
				this.errorHandler.handleError(err)
					.subscribe(_ => this.routing.toHome());
			}));
	}
	
	private onGameUpdate(state: GameState): void {
		if (this.isIntermissionPhase(state.phase)) {
			this.intermissionDialog = this.dialog.open(RoundEndDialogComponent, {
				data: {
					intermission: state.phase,
					players: this.game().players
				},
				disableClose: true,
			});
		} else {
			if (this.intermissionDialog) {
				this.intermissionDialog.close();
				this.intermissionDialog = undefined;
			}
		}
	}
	
	// Returns an observable that emits the remaining time in seconds until the
	// round ends, or undefined if there is no time limit on the round.
	private startRoundTimer(phase: PhaseState): Observable<number | undefined> {
		if (this.isIntermissionPhase(phase) || this.isGameOverPhase(phase) || !phase.roundEnd || !phase.roundDuration) {
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
		
		const initialTimer = Math.min(duration, end - now);
		return concat(of(Math.ceil(initialTimer / 1000)), ...timers);
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
		this.gameService().get().submitBet(target as BetTarget, wager).subscribe();
	}
	
	public onWithdrawBet(): void {
		const target =
			this.target === "AllTooHigh" || this.target === "Red" || this.target === "Black"
				? this.target
				: parseInt(this.target)!;
		this.gameService().get().withdrawBet(target as BetTarget).subscribe();
	}
	
	public onEndPhase(): void {
		this.gameService().get().endPhase().subscribe();
	}
	
	public onWagerBoxClick(target: BetTarget): void {
		// TODO: Close dialog if timer runs out.
		this.dialog
			.open(WagerDialog, { 
				width: "280px",
				height: "235px",
				data: this.availableChips(),
			})
			.afterClosed()
			.subscribe(wager => {
				// TODO: Target is incorrect.
				if (wager !== undefined) {
					this.gameService().get().submitBet(target as BetTarget, wager).subscribe();
				}
			});
	}
	
	// TODO: Temporary
	public testGuess(): { value: number; color: string } {
		return {
			value: 42,
			color: "gold",
		};
	}
	
	// TODO: Temporary
	public testBets(): { value: number; color: string }[] {
		return [
			{ value: 1, color: RED },
			{ value: 5, color: BLACK },
			{ value: 20, color: GREEN },
			{ value: 100, color: YELLOW },
			{ value: 1000, color: ORANGE },
			{ value: 10000, color: PURPLE },
			{ value: 100000, color: GRAY },
		];
	}
}
