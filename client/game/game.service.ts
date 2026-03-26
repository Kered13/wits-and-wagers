import { Injectable } from "@angular/core";
import { Observable, map, filter, catchError, of, NEVER, Subject, Subscription } from "rxjs";
import { safeParse } from "valibot";

import { BackendService } from "../utils/backend.service.js";
import { RefCounted } from "../utils/refcounted.js";
import { WebsocketError } from "../utils/websocket-error.js";
import { WebsocketService } from "../utils/websocket.service.js";
import { BetTarget } from "../../shared/game/betting-phase.js";
import { END_PHASE_PATH, EndPhaseRequest } from "../../shared/game/end-phase.js";
import { GAME_API_ROOT, type GameId, type GameState } from "../../shared/game/game.js";
import { JOIN_SPECTATOR_PATH, type JoinGameRequest, type JoinGameResponse } from "../../shared/game/join-game.js";
import { GameNotificationSchema, type GameNotification } from "../../shared/game/notifications.js";
import { SUBMIT_BET_PATH, SubmitBetRequest } from "../../shared/game/submit-bet.js";
import { GuessOrWithdraw, SUBMIT_GUESS_PATH, SubmitGuessRequest } from "../../shared/game/submit-guess.js";
import { SUBSCRIBE_PATH, SubscribeRequest } from "../../shared/game/subscribe.js";
import { PingRequest, PingResponse } from "../../shared/game/ping.js";
import { PrivateId } from "../../shared/player.js";
import { type WebSocketRequest } from "../../shared/websocket.interface.js";


@Injectable({providedIn: "root"})
export class GameService {
	private gameInstances = new Map<GameId, RefCounted<GameInstanceService>>();
	
	constructor(private backend: BackendService) {}
	
	private createGameInstanceService(gameId: GameId, privateId: PrivateId): RefCounted<GameInstanceService> {
		return new RefCounted<GameInstanceService>(new GameInstanceService(this, this.backend, gameId, privateId));
	}
	
	public getGameInstanceService(gameId: GameId, privateId: PrivateId): RefCounted<GameInstanceService> {
		let gameInstanceService = this.gameInstances.get(gameId);
		if (!gameInstanceService) {
			gameInstanceService = this.createGameInstanceService(gameId, privateId);
			this.gameInstances.set(gameId, gameInstanceService);
		}
		return gameInstanceService;
	}
	
	public joinGame(gameId: GameId, name: string, privateId?: PrivateId): Observable<JoinGameResponse> {
		return this.backend.postJson<JoinGameRequest, JoinGameResponse>(
			GAME_API_ROOT + JOIN_SPECTATOR_PATH, { gameId, name, privateId });
	}
	
	public removeGame(id: GameId): void {
		this.gameInstances.delete(id);
	}
}


export class GameInstanceService extends WebsocketService {
	private readonly PING_INTERVAL_MS = 5000;
	
	private readonly gameUpdate: Observable<GameState>;
	private readonly error: Observable<WebsocketError>;
	private readonly pongSub: Subscription;
	
	private pingTimeoutId: number;
	private pingOffsets: number[] = [];
	private clockSkew: number = 0;
	
	constructor(
			private readonly gameService: GameService,
			backend: BackendService,
			private readonly gameId: GameId,
			private readonly privateId: PrivateId) {
		super(GAME_API_ROOT + SUBSCRIBE_PATH, backend);
		
		const notifications = new Subject<GameNotification>();
		this.retryWsSubject.pipe(
				map(object => safeParse(GameNotificationSchema, object)),
				filter(parsed => parsed.success),
				map(parsed => parsed.output))
			.subscribe(notifications);
		
		this.gameUpdate = notifications.pipe(
			// Filter out errors. They can be caught by subscribing to the error
			// observable.
			catchError(err => NEVER),
			filter(notification => notification.type === "update"),
			map(update => update.state));
		
		this.pongSub = notifications.pipe(
				catchError(err => NEVER),
				filter(notification => notification.type === "pong"))
			.subscribe(notification => this.pong(notification));
		
		this.error = notifications.pipe(
			filter(notification => notification.type === "error"),
			map(err => new WebsocketError(err.message, err.status)),
			catchError(err => {
				if (err instanceof CloseEvent) {
					return of(new WebsocketError(`Server unexpectedly closed the connection: ${err.reason}`))
				} else if (err instanceof WebsocketError) {
					return of(err);
				} else {
					return of(new WebsocketError(`Unknown error occured: ${err} | ${err.toString()} | ${JSON.stringify(err)}`));
				};
			}));
		
		this.pingTimeoutId = setTimeout(() => this.ping(), 0);
	}
	
	protected override onOpen(event: Event): void {
		this.wsSubject.next({
			method: "subscribe",
			payload: {
				gameId: this.gameId,
				privateId: this.privateId,
			},
		} satisfies WebSocketRequest<SubscribeRequest>);
	}
	
	protected override onClose(): void {
		clearTimeout(this.pingTimeoutId);
		this.pongSub.unsubscribe();
		this.gameService.removeGame(this.gameId);
	}
	
	public submitGuess(guess: GuessOrWithdraw): Observable<void> {
		return this.backend.postJson<SubmitGuessRequest, void>(GAME_API_ROOT + SUBMIT_GUESS_PATH, {
			gameId: this.gameId,
			requester: this.privateId,
			guess
		});
	}
	
	public submitBet(target: BetTarget, wager: number): Observable<void> {
		return this.backend.postJson<SubmitBetRequest, void>(GAME_API_ROOT + SUBMIT_BET_PATH, {
			gameId: this.gameId,
			requester: this.privateId,
			target,
			wager
		});
	}
	
	public endPhase(): Observable<void> {
		return this.backend.postJson<EndPhaseRequest, void>(GAME_API_ROOT + END_PHASE_PATH, {
			gameId: this.gameId,
			requester: this.privateId
		});
	}
	
	// Completes when the game ends. Will not error.
	public onGameUpdate(): Observable<GameState> {
		return this.gameUpdate;
	}
	
	// Notifies on any errors in the notification stream.
	public onError(): Observable<WebsocketError> {
		return this.error;
	}
	
	public getClockSkew(): number {
		return this.clockSkew;
	}
	
	private ping(): void {
		this.wsSubject.next({
			method: "ping",
			payload: {
				clientTimestamp: Date.now(),
			},
		} satisfies WebSocketRequest<PingRequest>);
	}
	
	private pong(pong: PingResponse): void {
		const now = Date.now();
		const offset = (pong.clientTimestamp + now)/2 - pong.serverTimestamp;
		
		this.pingOffsets.push(offset);
		if (this.pingOffsets.length > 5) {
			this.pingOffsets.shift();
		}
		
		this.clockSkew = calculateSkew(this.pingOffsets);
		this.pingTimeoutId = setTimeout(() => this.ping(), this.PING_INTERVAL_MS);
	}
};


function calculateSkew(offsets: number[]): number {
	// Safe default.
	if (offsets.length === 0) {
		return 0;
	}
	
	if (offsets.length < 4) {
		// Return average of all offsets.
		return offsets.reduce((sum, offset) => sum + offset, 0) / offsets.length;
	}
	
	// Discard the highest and lowest offset, then return the average of the rest.
	const sortedOffsets = offsets.slice(1, -1).sort((a, b) => a - b);
	return sortedOffsets.reduce((sum, offset) => sum + offset, 0) / sortedOffsets.length;
}
