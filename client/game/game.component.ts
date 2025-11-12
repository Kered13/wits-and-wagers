import { Overlay } from "@angular/cdk/overlay";
import { ChangeDetectionStrategy, Component, computed, Directive, effect, ElementRef, Inject, input, Input, linkedSignal, OnDestroy, Signal, viewChild } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { FormsModule, NgModel } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { MatIcon } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatTooltip } from "@angular/material/tooltip";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { parseIntSafe } from "complete-common";
import { combineLatest, concat, delay, map, type Observable, of, pairwise, startWith, Subscription, switchMap, take } from "rxjs";

import { GameInstanceService, GameService } from "./game.service.js";
import { GameEndDialog } from "./game-end-dialog/game-end-dialog.component.js";
import { GuessCard, GuessCardData } from "./guess-card/guess-card.component.js";
import { GuessDialog, GuessDialogData } from "./guess-dialog/guess-dialog.component.js";
import { HelpDialog, HelpDialogData } from "./help-dialog/help-dialog.component.js";
import { PlayerScoreCard, ScoreBoard } from "./score-board/score-board.component.js";
import { AllTooHighBox } from "./wager-box/all-too-high-box.component.js";
import { BetData } from "./wager-box/base-wager-box.component.js";
import { BettingBox } from "./wager-box/wager-box.component.js";
import { ColorWagerBox } from "./wager-box/color-wager-box.component.js";
import { WagerBoxBgText, WagerBoxBottomText } from "./wager-box/wager-box-content.component.js";
import { WagerDialog, WagerDialogData } from "./wager-dialog/wager-dialog.component.js";
import { GlobalErrorHandler } from "../error-dialog/error-handler.js";
import { RoundEndDialog, RoundEndDialogData } from "./round-end-dialog/round-end-dialog.component.js";
import { GameRoute, TypedRouteFor } from "../routes/routes.js";
import { RoutingService } from "../routes/routing.service.js";
import { RandomizedList } from "../utils/randomized-list.js";
import { RefCounted } from "../utils/refcounted.js";
import { Color } from "../../shared/color.js";
import { PrivatePlayer, PublicId } from "../../shared/player.js";
import { Bet, BetTarget, BettingPhaseState } from "../../shared/game/betting-phase.js";
import { GameOverPhaseState, GamePlayer, GameState } from "../../shared/game/game.js";
import { QuestionPhaseState } from "../../shared/game/question-phase.js";
import { IntermissionPhaseState } from "../../shared/game/intermission-phase.js";
import { GuessOrWithdraw } from "../../shared/game/submit-guess.js";


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
	return game.players.some(player => player.publicId === participant);
}


function shouldEnableBetTarget(target: BetTarget, game: GameState, publicId: PublicId): boolean {
	const phase = game.phase;
	if (!isBettingPhase(phase)) {
		return false;
	}
	
	// Disable if there is no guess on this target.
	if (typeof(target) === "number" && !getGuessForTarget(target, game)) {
		return false;
	}
	
	// Disable target if there are no available chips, unless this target
	// already has a bet on it.
	const existingBetOnTarget = getPlayerBetOnTarget(publicId, target, phase);
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


function getBetsOnTarget(target: BetTarget, game: GameState): BetData[] {
	const phase = game.phase;
	if (!isBettingPhase(phase)) {
		return [];
	}
	
	const bets = getPlayerBetsOnTarget(target, game, phase);
	const spectatorBet = getSpectatorBetOnTarget(target, game, phase);
	if (spectatorBet) {
		bets.push(spectatorBet);
	}
	return bets;
}


function getPlayerBetsOnTarget(target: BetTarget, game: GameState, phase: BettingPhaseState): BetData[] {
	return phase.bets
		.filter(bet => bet.target === target)
		.map(bet => ({
			value: bet.wager,
			name: nameForPlayer(game, bet.player),
			color: colorForPlayer(game, bet.player),
		}));
}


function getSpectatorBetOnTarget(target: BetTarget, game: GameState, phase: BettingPhaseState): BetData | undefined {
	return phase.spectatorBets
		.filter(bet => bet.target === target)
		.map(bet => ({
			value: bet.wager,
			name: nameForPlayer(game, bet.player),
		}))[0];
}


function getPlayerBetOnTarget(publicId: PublicId, target: BetTarget, phase: BettingPhaseState): Bet | undefined {
	return phase.bets.find(bet => bet.player === publicId && bet.target === target) ??
		phase.spectatorBets.find(bet => bet.player === publicId && bet.target === target);
}


function getGuessForTarget(target: BetTarget, game: GameState): GuessCardData | undefined {
	const phase = game.phase;
	if (!isBettingPhase(phase)) {
		return undefined;
	}
	
	return phase.guesses
		.filter(guess => guess.target === target)
		.map(guess => guessCardData(game, guess.guess, guess.player))[0];
}


function playerHasGuess(publicId: PublicId, game: GameState): boolean {
	const phase = game.phase;
	if (!isQuestionPhase(phase)) {
		return false;
	}
	return (phase.guesses[publicId] ?? false) !== false || phase.spectatorGuess !== undefined;
}


function nameForPlayer(game: GameState, publicId: PublicId): string {
	return game.players.find(player => player.publicId === publicId)?.name ??
		game.spectators.find(spec => spec.publicId === publicId)?.name!;
}


function colorForPlayer(game: GameState, publicId: PublicId): Color {
	return game.players.find(player => player.publicId === publicId)!.color;
}


function getGuessCards(game: GameState, thisPlayer: PrivatePlayer): GuessCardData[] {
	const phase = game.phase;
	if (!isQuestionPhase(phase)) {
		return [];
	}
	const guesses: GuessCardData[] = game.players
		.filter(player => phase.guesses[player.publicId] !== false)
		.map(player => guessCardData(game, phase.guesses[player.publicId], player.publicId));
	if (phase.spectatorGuess !== undefined) {
		guesses.push({
			name: nameForPlayer(game, thisPlayer.publicId),
			value: phase.spectatorGuess,
		});
	}
	return guesses;
}


function guessCardData(game: GameState, guess: number | boolean, player: PublicId): GuessCardData {
	return {
		name: nameForPlayer(game, player),
		value: guess,
		color: colorForPlayer(game, player),
	};
};


@Component({
	selector: "app-game",
	imports: [
		FormsModule,
		MatCardModule,
		MatIcon,
		MatInputModule,
		MatTooltip,
		AllTooHighBox,
		BettingBox,
		ColorWagerBox,
		GuessCard,
		ScoreBoard,
		WagerBoxBgText,
		WagerBoxBottomText,
	],
	templateUrl: "./game.component.html",
	styleUrl: "./game.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameComponent implements OnDestroy {
	private readonly gameService: Signal<RefCounted<GameInstanceService>>;
	private readonly subs: Subscription[] = [];
	private guessDialog: MatDialogRef<GuessDialog, GuessOrWithdraw> | undefined = undefined;
	private wagerDialog: MatDialogRef<WagerDialog, number> | undefined = undefined;
	private helpDialog: MatDialogRef<HelpDialog> | undefined = undefined;
	private intermissionDialog: MatDialogRef<RoundEndDialog> | undefined = undefined;
	
	readonly game: Signal<GameState>;
	readonly thisParticipant: Signal<PrivatePlayer>;
	readonly roundTimer: Signal<number | undefined>;
	readonly guessField: Signal<NgModel | undefined> = viewChild("guessField");
	readonly targetField: Signal<NgModel | undefined> = viewChild("targetField");
	readonly wagerField: Signal<NgModel | undefined> = viewChild("wagerField");
	readonly guessCards: Signal<RandomizedList<GuessCardData>>;
	
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
		this.subs.push(instanceService.pipe(startWith(undefined), pairwise())
			.subscribe(([oldService, newService]) => this.onNewGame(oldService, newService!)));
		
		const initialState: GameState = {
			title: "",
			host: "" as PublicId,
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
		this.subs.push(gameObs.pipe(startWith(undefined), pairwise()).subscribe({
			next: ([oldState, state]) => {
				this.onGameUpdate(oldState, state!);
			},
			complete: () => {
				// TODO: Would this be simpler if we react to GameOverPhase?
				this.dialog.afterAllClosed.pipe(take(1)).subscribe(() =>
					this.dialog.open<GameEndDialog, GameState>(GameEndDialog, {
						data: this.game(),
						scrollStrategy: this.overlay.scrollStrategies.noop(),
					}));
			}
		})),
		
		this.subs.push(instanceService.pipe(switchMap(service => service.get().onError()))
			.subscribe(err => {
				// Completes immediately after notifying, so we don't need to
				// unsubscribe.
				this.errorHandler.handleError(err)
					.subscribe(_ => this.routing.toHome());
			}));
		
		this.gameService = toSignal(instanceService, { requireSync: true });
		this.game = toSignal(gameObs, { initialValue: initialState });
		
		this.roundTimer = toSignal(
			gameObs.pipe(switchMap(game => this.startRoundTimer(game.phase))),
			{ initialValue: undefined });
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.game().title));
		
		const guessData = computed(() => getGuessCards(this.game(), this.thisParticipant()));
		this.guessCards = linkedSignal<GuessCardData[], RandomizedList<GuessCardData>>({
			source: guessData,
			computation: (guesses, previous) => {
				const old = previous?.value ?? new RandomizedList([], 3, 8);
				return old.update(guesses);
			},
		});
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
	
	private onGameUpdate(oldState: GameState | undefined, state: GameState): void {
		if (oldState && oldState.phase.phase !== state.phase.phase) {
			this.closeHelpDialog();
		}
		
		if (this.isQuestionPhase(state.phase)) {
			if (this.shouldOpenGuessDialog(state, this.thisParticipant().publicId)) {
				this.openGuessDialog();
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
		this.closeHelpDialog();
		service.release();
	}
	
	// Ensure that we do not open multiple guess dialogs.
	private shouldOpenGuessDialog(game: GameState, publicId: PublicId): boolean {
		return !this.guessDialog &&
			!playerHasGuess(publicId, game);
	}
	
	private openGuessDialog(currentGuess?: number): void {
		const rect = this.hostElement.nativeElement.querySelector(".board").getBoundingClientRect();
		const top = rect.top + rect.height / 2 - 180 / 2;
		this.guessDialog = this.dialog
			.open<GuessDialog, GuessDialogData, GuessOrWithdraw>(GuessDialog, {
				data: {
					initialPosition: top,
					currentGuess: currentGuess,
				},
				disableClose: currentGuess === undefined,
				hasBackdrop: currentGuess !== undefined,
				scrollStrategy: this.overlay.scrollStrategies.noop(),
			});
		this.guessDialog.afterClosed().subscribe(guess => {
			if (guess !== undefined) {
				// A return value of 0 indicates that the player wishes to
				// withdraw their existing guess.
				this.gameService().get().submitGuess(guess).subscribe();
			}
			this.guessDialog = undefined;
		});
	}
	
	private closeGuessDialog(): void {
		if (this.guessDialog) {
			this.guessDialog.close();
			this.guessDialog = undefined;
		}
	}
	
	private openWagerDialog(game: GameState, phase: BettingPhaseState, target: BetTarget): void {
		const existingBet = getPlayerBetOnTarget(this.thisParticipant().publicId, target, phase);
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
			this.wagerDialog = undefined;
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
	
	help(): void {
		const phase = this.game().phase.phase;
		if (phase === "question" || phase === "betting") {
			this.helpDialog = this.dialog
				.open<HelpDialog, HelpDialogData>(HelpDialog, {
					data: {
						phase: phase,
					},
				});
		}
	}
	
	private closeHelpDialog(): void {
		if (this.helpDialog) {
			this.helpDialog.close();
			this.helpDialog = undefined;
		}
	}
	
	public ngOnDestroy(): void {
		this.closeGameService(this.gameService());
		for (const sub of this.subs) {
			sub.unsubscribe();
		}
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
	
	public onGuessCardClick(): void {
		const game = this.game();
		if (!isQuestionPhase(game.phase)) {
			return;
		}
		const guess = game.phase.guesses[this.thisParticipant().publicId];
		if (typeof(guess) !== "number") {
			return;
		}
		this.openGuessDialog(guess);
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
	
	getBetsOnTarget(target: BetTarget): BetData[] {
		return getBetsOnTarget(target, this.game());
	}
	
	getGuessForTarget(target: BetTarget): GuessCardData | undefined {
		return getGuessForTarget(target, this.game());
	}
	
	getRound(): string {
		const game = this.game();
		if (isGameOverPhase(game.phase)) {
			return "Game Over";
		}
		return "Round " + game.round;
	}
	
	getPhase(): string {
		const phase = this.game().phase;
		if (isQuestionPhase(phase)) {
			return "Guess";
		} else if (isBettingPhase(phase)) {
			return "Bet";
		} else if (isIntermissionPhase(phase)) {
			return "Results";
		} else {
			return "";
		}
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
	
	getPlayersForScore(): PlayerScoreCard[] {
		const game = this.game();
		const spec = game.spectators.filter(s => s.publicId === this.thisParticipant().publicId);
		return [...game.players, ...spec];
	}
	
	getCardPosition(index: number): string {
		return [
			"translate(20px, 5px) rotate(-10deg)",
			"translate(-130px, 50px) rotate(10deg)",
			"translate(80px, -100px) rotate(20deg)",
			"translate(180px, 70px) rotate(-15deg)",
			"translate(-80px, -130px) rotate(-25deg)",
			"translate(-190px, -50px) rotate(5deg)",
			"translate(210px, -35px) rotate(5deg)",
			"translate(20px, -175px) rotate(-5deg)",
		][index];
	}
}
