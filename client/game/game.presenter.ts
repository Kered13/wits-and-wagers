import { Overlay } from "@angular/cdk/overlay";
import { computed, effect, ElementRef, Inject, Injectable, linkedSignal, Signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { combineLatest, concat, delay, map, type Observable, of, pairwise, startWith, Subscription, switchMap, take } from "rxjs";

import { BetData } from "./betting-chip/betting-chip.component.js";
import { GameEndDialog } from "./game-end-dialog/game-end-dialog.component.js";
import { GameInstanceService, GameService } from "./game.service.js";
import { GuessCardData } from "./guess-card/guess-card.component.js";
import { GuessDialog, GuessDialogData } from "./guess-dialog/guess-dialog.component.js";
import { HelpDialog, HelpDialogData } from "./help-dialog/help-dialog.component.js";
import { PlayerScoreData } from "./player-score-data.js";
import { RoundEndDialog, RoundEndDialogData } from "./round-end-dialog/round-end-dialog.component.js";
import { WagerDialog, WagerDialogData } from "./wager-dialog/wager-dialog.component.js";
import { GlobalErrorHandler } from "../error-dialog/error-handler.js";
import { GameRoute, TypedRouteFor } from "../routes/routes.js";
import { RoutingService } from "../routes/routing.service.js";
import { RandomizedList } from "../utils/randomized-list.js";
import { RefCounted } from "../utils/refcounted.js";
import { Color, SPECTATOR } from "../../shared/color.js";
import { PrivatePlayer, PublicId } from "../../shared/player.js";
import { Bet, BetTarget, BettingPhaseState } from "../../shared/game/betting-phase.js";
import { GameOverPhaseState, GamePlayer, GameSpectator, GameState } from "../../shared/game/game.js";
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


// Returns an observable that emits the remaining time in seconds until the
// round ends, or undefined if there is no time limit on the round.
function startRoundTimer(phase: PhaseState): Observable <number | undefined> {
	if(isIntermissionPhase(phase) || isGameOverPhase(phase) || !phase.roundEnd || !phase.roundDuration) {
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


function availableChips(game: GameState, publicId: PublicId): number {
	const player = game.players.find(player => player.publicId === publicId) ||
		game.spectators.find(spectator => spectator.publicId === publicId);
	return player?.chips ?? 0;
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
	const existingOtherBets = [...phase.bets, ...phase.spectatorBets].filter(
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
	
	return [
		...getBetsOnTarget2(target, "player", phase, game),
		...getBetsOnTarget2(target, "spectator", phase, game)];
}


function getBetsOnTarget2(
		target: BetTarget,
		type: "player" | "spectator",
		phase: BettingPhaseState,
		game: GameState): BetData[] {
	return (type === "player" ? phase.bets : phase.spectatorBets)
		.filter(bet => bet.target === target)
		.map(bet => ({
			type: type,
			value: bet.wager,
			color: colorForPlayer(game, bet.player),
		}));
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


function getSpectatorGuess(game: GameState): GuessCardData | undefined {
	const phase = game.phase;
	if (!isBettingPhase(phase)) {
		return undefined;
	}
	if (phase.spectatorGuess === undefined) {
		return undefined;
	}
	return spectatorGuessCardData(phase.spectatorGuess);
}


function playerHasGuess(publicId: PublicId, game: GameState): boolean {
	const phase = game.phase;
	if (!isQuestionPhase(phase)) {
		return false;
	}
	return (phase.guesses[publicId] ?? false) !== false || phase.spectatorGuess !== undefined;
}


function colorForPlayer(game: GameState, publicId: PublicId): Color {
	return game.players.find(player => player.publicId === publicId)?.color ?? SPECTATOR;
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
		guesses.push(spectatorGuessCardData(phase.spectatorGuess));
	}
	return guesses;
}


function guessCardData(game: GameState, guess: number | boolean, player: PublicId): GuessCardData {
	return {
		type: "player",
		value: guess,
		color: colorForPlayer(game, player),
	};
};


function spectatorGuessCardData(guess: number): GuessCardData {
	return {
		type: "spectator",
		value: guess,
		color: SPECTATOR,
	};
}


export interface GameView {
	getHostElement(): ElementRef;
}


@Injectable()
export class GamePresenter {
	private readonly gameService: Signal<RefCounted<GameInstanceService>>;
	private readonly subs: Subscription[] = [];
	private view: GameView | undefined = undefined;
	private guessDialog: MatDialogRef<GuessDialog, GuessOrWithdraw> | undefined = undefined;
	private wagerDialog: MatDialogRef<WagerDialog, number> | undefined = undefined;
	private helpDialog: MatDialogRef<HelpDialog> | undefined = undefined;
	private intermissionDialog: MatDialogRef<RoundEndDialog> | undefined = undefined;
	
	readonly game: Signal<GameState>;
	readonly thisParticipant: Signal<PrivatePlayer>;
	public readonly roundTimer: Signal<number | undefined>;
	public readonly guessCardsList: Signal<RandomizedList<GuessCardData>>;
	
	guess: string = ""
	target: string = ""
	wager: string = ""
	
	constructor(
			private readonly errorHandler: GlobalErrorHandler,
			private readonly routing: RoutingService,
			private readonly dialog: MatDialog,
			private readonly overlay: Overlay,
			gameService: GameService,
			titleService: Title,
			@Inject(ActivatedRoute) route: TypedRouteFor<GameRoute>) {
		this.thisParticipant = toSignal(route.data.pipe(map(data => data.player)), { requireSync: true });
		
		const instanceService = combineLatest([route.params, route.data]).pipe(
			map(([params, data]) => gameService.getGameInstanceService(params.gameId, data.player.privateId)));
		this.subs.push(instanceService.pipe(startWith(undefined), pairwise())
			.subscribe(([oldService, newService]) => this.onNewGame(oldService, newService!)));
		
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
		this.game = toSignal(gameObs, { initialValue: initialState });
		this.gameService = toSignal(instanceService, { requireSync: true });
		
		this.roundTimer = toSignal(
			gameObs.pipe(switchMap(game => startRoundTimer(game.phase))),
			{ initialValue: undefined });
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.game().title));
		
		const guessData = computed(() => getGuessCards(this.game(), this.thisParticipant()));
		this.guessCardsList = linkedSignal<GuessCardData[], RandomizedList<GuessCardData>>({
			source: guessData,
			computation: (guesses, previous) => {
				const old = previous?.value ?? new RandomizedList([], 3, 8);
				return old.update(guesses);
			},
		});
	}
	
	public setView(view: GameView): void {
		this.view = view;
	}
	
	public isQuestionPhase(): boolean {
		return isQuestionPhase(this.game().phase);
	}
	
	public isBettingPhase(): boolean {
		return isBettingPhase(this.game().phase);
	}
	
	public isIntermissionPhase(): boolean {
		return isIntermissionPhase(this.game().phase);
	}
	
	public isGameOverPhase(): boolean {
		return isGameOverPhase(this.game().phase);
	}
	
	public isHost(): boolean {
		return this.game().host === this.thisParticipant().publicId;
	}
	
	public guessCards(): (GuessCardData | undefined)[] {
		return this.guessCardsList().entries();
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
		
		if (isQuestionPhase(state.phase)) {
			if (this.shouldOpenGuessDialog(state, this.thisParticipant().publicId)) {
				this.openGuessDialog();
			}
		} else {
			this.closeGuessDialog();
		}
		
		// There is only one update during intermission, so we don't have to
		// check for re-opening the dialog here.
		if (isIntermissionPhase(state.phase)) {
			this.openIntermissionDialog(state.phase, state.players, state.spectators);
		} else {
			this.closeIntermissionDialog();
		}
		
		if (!isBettingPhase(state.phase)) {
			this.closeWagerDialog();
		}
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
		return !this.guessDialog && !playerHasGuess(publicId, game);
	}
	
	private openGuessDialog(currentGuess?: number): void {
		if (!this.view) {
			return;
		}
		const rect = this.view.getHostElement()
			.nativeElement
			.querySelector(".board")
			.getBoundingClientRect();
		// TODO: 180 is a hardcoded height. Try to do better than this.
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
	
	private openIntermissionDialog(phase: IntermissionPhaseState, players: GamePlayer[], spectators: GameSpectator[]): void {
		this.intermissionDialog = this.dialog
			.open<RoundEndDialog, RoundEndDialogData>(RoundEndDialog, {
				data: {
					intermission: phase,
					players: players,
					spectators: spectators,
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
	
	private openHelpDialog(): void {
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
	
	public destroy(): void {
		this.closeGameService(this.gameService());
		for (const sub of this.subs) {
			sub.unsubscribe();
		}
	}
	
	public onSkipPhaseClick(): void {
		if (this.isHost()) {
			this.gameService().get().endPhase().subscribe();
		}
	}
	
	public onGuessCardClick(): void {
		const game = this.game();
		if (!isQuestionPhase(game.phase)) {
			return;
		}
		let guess = game.phase.spectatorGuess ?? game.phase.guesses[this.thisParticipant().publicId];
		if (typeof(guess) !== "number") {
			return;
		}
		this.openGuessDialog(guess);
	}
	
	public onWagerBoxClick(target: BetTarget): void {
		const game = this.game();
		const phase = game.phase;
		if (!isBettingPhase(phase)) {
			return;
		}
		this.openWagerDialog(game, phase, target);
	}
	
	public onHelpClick(): void {
		this.openHelpDialog();
	}
	
	public shouldEnableBetTarget(target: BetTarget): boolean {
		return shouldEnableBetTarget(target, this.game(), this.thisParticipant().publicId);
	}
	
	public getBetsOnTarget(target: BetTarget): BetData[] {
		return getBetsOnTarget(target, this.game());
	}
	
	public getGuessForTarget(target: BetTarget): GuessCardData | undefined {
		return getGuessForTarget(target, this.game());
	}
	
	public getSpectatorGuess(): GuessCardData | undefined {
		return getSpectatorGuess(this.game());
	}
	
	public getRound(): string {
		const game = this.game();
		if (isGameOverPhase(game.phase)) {
			return "Game Over";
		}
		return "Round " + game.round;
	}
	
	public getPhase(): string {
		const phase = this.game().phase;
		if (isQuestionPhase(phase)) {
			return "Guess";
		} else if (isBettingPhase(phase)) {
			return "Bet";
		} else if (isIntermissionPhase(phase)) {
			return "Result";
		} else {
			return "";
		}
	}
	
	public getQuestion(): string {
		const phase = this.game().phase;
		if (isGameOverPhase(phase)) {
			return "";
		}
		return phase.questionInfo.question;
	}
	
	public getSource(): string {
		const phase = this.game().phase;
		if (isGameOverPhase(phase)) {
			return "";
		}
		const { source, date } = phase.questionInfo;
		if (!source) {
			return "";
		}
		return "Source: " + source + (date ? ` (${date})` : "");
	}
	
	public getPlayersForScore(): PlayerScoreData[] {
		const game = this.game();
		const spec = game.spectators.filter(s => s.publicId === this.thisParticipant().publicId);
		return [...game.players, ...spec];
	}
}
