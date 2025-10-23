import { Overlay } from "@angular/cdk/overlay";
import { ChangeDetectionStrategy, Component, Directive, effect, ElementRef, Inject, input, Input, OnDestroy, Signal, viewChild } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { AbstractControl, FormsModule, NG_VALIDATORS, NgModel, ValidationErrors, Validator } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { MatIcon } from "@angular/material/icon";
import { MatError, MatInputModule } from "@angular/material/input";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { parseIntSafe } from "complete-common";
import { combineLatest, concat, delay, map, type Observable, of, pairwise, startWith, Subscription, switchMap, take } from "rxjs";

import { GuessDialog, GuessDialogData } from "./guess-dialog/guess-dialog.component.js";
import { AllTooHighBox } from "./wager-box/all-too-high-box.component.js";
import { BettingBox } from "./wager-box/wager-box.component.js";
import { ColorWagerBox } from "./wager-box/color-wager-box.component.js";
import { WagerBoxBgText, WagerBoxBottomText } from "./wager-box/wager-box-content.component.js";
import { WagerDialog, WagerDialogData } from "./wager-dialog/wager-dialog.component.js";
import { GameInstanceService, GameService } from "./game.service.js";
import { GameEndDialog } from "./game-end-dialog/game-end-dialog.component.js";
import { GlobalErrorHandler } from "../error-dialog/error-handler.js";
import { RoundEndDialog, RoundEndDialogData } from "./round-end-dialog/round-end-dialog.component.js";
import { GameRoute, TypedRouteFor } from "../routes/routes.js";
import { RoutingService } from "../routes/routing.service.js";
import { RefCounted } from "../utils/refcounted.js";
import { PrivatePlayer, PublicId } from "../../shared/player.js";
import { BetTarget, BettingPhaseState } from "../../shared/game/betting-phase.js";
import { GameOverPhaseState, GamePlayer, GameState } from "../../shared/game/game.js";
import { QuestionPhaseState } from "../../shared/game/question-phase.js";
import { IntermissionPhaseState } from "../../shared/game/intermission-phase.js";
import { QuestionInfo } from "../../shared/game/question.js";


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
		if (value === undefined || value < 0 || value >= 7) {
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


function isQuestionPhase(phase: PhaseState): phase is QuestionPhaseState {
	return phase.phase === "question";
}


function isBettingPhase(phase: PhaseState): phase is BettingPhaseState {
	return phase.phase === "betting";
}


function isIntermissionPhase(phase: PhaseState): phase is IntermissionPhaseState {
	return phase.phase === "intermission";
}


function isGameOverPhase(phase: PhaseState): phase is GameOverPhaseState {
	return phase.phase === "game-over";
}


function availableChips(game: GameState, publicId: PublicId): number {
	const player = game.players.find(player => player.publicId === publicId) ||
		game.spectators.find(spectator => spectator.publicId === publicId);
	return player?.chips ?? 0;
}


function isPlayer(game: GameState, participant: PublicId): boolean {
	const b = game.players.some(player => player.publicId === participant);
	console.log(b);
	return b;
}


function shouldEnableBetTarget(target: BetTarget, game: GameState, publicId: PublicId): boolean {
	const phase = game.phase;
	if (!isBettingPhase(phase)) {
		return false;
	}
	
	// Disable target if there are no available chips, unless this target
	// already has a bet on it.
	const existingBetOnTarget = phase.bets.find(
		bet => bet.player === publicId && bet.target === target);
	if (availableChips(game, publicId) <= 0 && !existingBetOnTarget) {
		return false;
	}
	
	// Disable target if there are already two bets on other targets.
	const existingOtherBets = phase.bets.filter(
		bet => bet.player === publicId && bet.target !== target);
	if (existingOtherBets.length >= 2) {
		return false;
	}
	
	return true;
}


function getBetsOnTarget(target: BetTarget, game: GameState): { value: number; color: string; } [] {
	const phase = game.phase;
	if (!isBettingPhase(phase)) {
		return [];
	}

	return phase.bets
		.filter(bet => bet.target === target)
		.map(bet => ({
			value: bet.wager,
			color: colorForPlayer(game, bet.player),
		}));
}


function getGuessForTarget(target: BetTarget, game: GameState): { value: number; color: string; } | undefined {
	const phase = game.phase;
	if (!isBettingPhase(phase)) {
		return undefined;
	}

	return phase.guesses
		.filter(guess => guess.target === target)
		.map(guess => ({
			value: guess.guess,
			color: colorForPlayer(game, guess.player),
		}))[0];
}


function playerHasGuess(publicId: PublicId, game: GameState): boolean {
	const phase = game.phase;
	if (!isQuestionPhase(phase)) {
		return false;
	}
	return phase.guesses[publicId] !== false;
}


function colorForPlayer(game: GameState, publicId: PublicId): string {
	return game.players.find(player => player.publicId === publicId)!.color;
}


@Component({
	selector: "app-game",
	imports: [
		ChipValidator,
		FormsModule,
		GuessValidator,
		MatButton,
		MatCardModule,
		MatError,
		MatIcon,
		MatInputModule,
		TargetValidator,
		AllTooHighBox,
		BettingBox,
		ColorWagerBox,
		WagerBoxBgText,
		WagerBoxBottomText,
	],
	templateUrl: "./game.component.html",
	styleUrl: "./game.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameComponent implements OnDestroy {
	private readonly gameService: Signal<RefCounted<GameInstanceService>>;
	private readonly instanceSub: Subscription;
	private guessDialog: MatDialogRef<GuessDialog> | undefined = undefined;
	private wagerDialog: MatDialogRef<WagerDialog> | undefined = undefined;
	private intermissionDialog: MatDialogRef<RoundEndDialog> | undefined = undefined;
	
	readonly game: Signal<GameState>;
	readonly thisParticipant: Signal<PrivatePlayer>;
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
			private readonly overlay: Overlay,
			private readonly hostElement: ElementRef,
			gameService: GameService,
			titleService: Title,
			@Inject(ActivatedRoute) route: TypedRouteFor<GameRoute>) {
		this.thisParticipant = toSignal(route.data.pipe(map(data => data.player)), { requireSync: true });
		
		const instanceService = combineLatest([route.params, route.data]).pipe(
			map(([params, data]) => gameService.getGameInstanceService(params.gameId, data.player.privateId)));
		this.instanceSub = instanceService.pipe(startWith(undefined), pairwise())
			.subscribe(([oldService, newService]) => this.onNewGame(oldService, newService!));
		
		const initialState: GameState = {
			title: "",
			host: "",
			players: [],
			spectators: [],
			round: 0,
			phase: {
				phase: "question",
				questionInfo: {
					question: "",
				},
				guesses: {},
			},
		};
		const gameObs = instanceService.pipe(switchMap(service => service.get().onGameUpdate()));
		gameObs.subscribe({
			next: (state) => {
				this.onGameUpdate(state);
			},
			complete: () => {
				// TODO: Would this be simpler if we react to GameOverPhase?
				this.dialog.afterAllClosed.pipe(take(1)).subscribe(() =>
					this.dialog.open<GameEndDialog, GameState>(GameEndDialog, {
						data: this.game(),
						scrollStrategy: this.overlay.scrollStrategies.noop(),
					}));
			}
		}),
		
		instanceService.pipe(switchMap(service => service.get().onError()))
			.subscribe(err => {
				this.errorHandler.handleError(err)
					.subscribe(_ => this.routing.toHome());
			});
		
		this.gameService = toSignal(instanceService, { requireSync: true });
		this.game = toSignal(gameObs, { initialValue: initialState });
		
		this.roundTimer = toSignal(
			gameObs.pipe(switchMap(game => this.startRoundTimer(game.phase))),
			{ initialValue: undefined });
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.game().title));
	}
	
	isQuestionPhase(phase: PhaseState): phase is QuestionPhaseState {
		return isQuestionPhase(phase);
	}
	
	isBettingPhase(phase: PhaseState): phase is BettingPhaseState {
		return isBettingPhase(phase);
	}
	
	isIntermissionPhase(phase: PhaseState): phase is IntermissionPhaseState {
		return isIntermissionPhase(phase);
	}
	
	isGameOverPhase(phase: PhaseState): phase is GameOverPhaseState {
		return isGameOverPhase(phase);
	}
	
	isPlayer(): boolean {
		return isPlayer(this.game(), this.thisParticipant().publicId);
	}
	
	private onNewGame(oldService: RefCounted<GameInstanceService> | undefined, newService: RefCounted<GameInstanceService>): void {
		if (oldService) {
			this.closeGameService(oldService);
		}
		newService.acquire();
	}
	
	private onGameUpdate(state: GameState): void {
		if (this.isQuestionPhase(state.phase)) {
			if (this.shouldOpenGuessDialog(state, this.thisParticipant().publicId)) {
				this.openGuessDialog(state.phase.questionInfo);
			}
		} else {
			this.closeGuessDialog();
		}
		
		// There is only one update during intermission, so we don't have to
		// check for re-opening the dialog here.
		if (this.isIntermissionPhase(state.phase)) {
			this.openIntermissionDialog(state.phase, state.players);
		} else {
			this.closeIntermissionDialog();
		}
		
		if (!this.isBettingPhase(state.phase)) {
			this.closeWagerDialog();
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
		this.closeGuessDialog();
		this.closeWagerDialog();
		this.closeIntermissionDialog();
		service.release();
	}
	
	// Ensure that we do not open multiple guess dialogs.
	private shouldOpenGuessDialog(game: GameState, publicId: PublicId): boolean {
		return !this.guessDialog &&
			isPlayer(game, publicId) &&
			!playerHasGuess(publicId, game);
	}
	
	private openGuessDialog(questionInfo: QuestionInfo): void {
		const rect = this.hostElement.nativeElement.querySelector(".board").getBoundingClientRect();
		const top = rect.top + rect.height / 2 - 180 / 2;
		this.guessDialog = this.dialog
			.open<GuessDialog, GuessDialogData>(GuessDialog, {
				data: { questionInfo: questionInfo, initialPosition: top },
				disableClose: true,
				hasBackdrop: false,
				panelClass: "my-panel-class",
				scrollStrategy: this.overlay.scrollStrategies.noop(),
			});
		this.guessDialog.afterClosed().subscribe(guess => {
			console.log("Closing guess dialog");
			if (guess !== undefined) {
				console.log("Closed guess dialog");
				this.gameService().get().submitGuess(guess).subscribe();
			}
		});
		console.log("Opened guess dialog");
		console.log(this.guessDialog);
	}
	
	private closeGuessDialog(): void {
		if (this.guessDialog) {
			this.guessDialog.close();
			this.guessDialog = undefined;
		}
	}
	
	private openWagerDialog(game: GameState, phase: BettingPhaseState, target: BetTarget): void {
		const existingBet = phase.bets.find(
			bet => bet.player === this.thisParticipant().publicId && bet.target === target);
		this.wagerDialog = this.dialog
			.open<WagerDialog, WagerDialogData>(WagerDialog, {
				data: {
					availableChips: availableChips(game, this.thisParticipant().publicId),
					existingWager: existingBet?.wager,
				},
				scrollStrategy: this.overlay.scrollStrategies.noop(),
			});
		this.wagerDialog.afterClosed().subscribe(wager => {
			if (wager !== undefined) {
				this.gameService().get().submitBet(target as BetTarget, wager).subscribe();
			}
		});
	}
	
	private closeWagerDialog(): void {
		if (this.wagerDialog) {
			this.wagerDialog.close();
			this.wagerDialog = undefined;
		}
	}
	
	private openIntermissionDialog(phase: IntermissionPhaseState, players: GamePlayer[]): void {
		this.intermissionDialog = this.dialog
			.open<RoundEndDialog, RoundEndDialogData>(RoundEndDialog, {
				data: {
					intermission: phase,
					players: players,
				},
				disableClose: true,
				scrollStrategy: this.overlay.scrollStrategies.noop(),
			});
	}
	
	private closeIntermissionDialog(): void {
		if (this.intermissionDialog) {
			this.intermissionDialog.close();
			this.intermissionDialog = undefined;
		}
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
		this.gameService().get().submitBet(target as BetTarget, 0).subscribe();
	}
	
	public onEndPhase(): void {
		this.gameService().get().endPhase().subscribe();
	}
	
	public onWagerBoxClick(target: BetTarget): void {
		const game = this.game();
		const phase = game.phase;
		if (!this.isBettingPhase(phase)) {
			return;
		}
		this.openWagerDialog(game, phase, target);
	}
	
	availableChips(): number {
		return availableChips(this.game(), this.thisParticipant().publicId);
	}
	
	shouldEnableBetTarget(target: BetTarget): boolean {
		return shouldEnableBetTarget(target, this.game(), this.thisParticipant().publicId);
	}
	
	getBetsOnTarget(target: BetTarget): { value: number; color: string }[] {
		return getBetsOnTarget(target, this.game());
	}
	
	getGuessForTarget(target: BetTarget): { value: number; color: string } | undefined {
		return getGuessForTarget(target, this.game());
	}
	
	getRound() {
		const round = this.game().round;
		return round > 7 ? "Game Over" : ("Round " + round);
	}
	
	getQuestion(phase: PhaseState): string {
		if (isGameOverPhase(phase)) {
			return "";
		}
		return phase.questionInfo.question;
	}
	
	getSource(phase: PhaseState): string {
		if (isGameOverPhase(phase)) {
			return "";
		}
		const { source, date } = phase.questionInfo;
		if (!source) {
			return "";
		}
		return "Source: " + source + (date ? ` (${date})` : "");
	}
	
	// TODO: Remove once dev UI is deleted.
	tempGameString(): string {
		return JSON.stringify(this.game(), null, 2)
	}
}
