import { Injectable } from "@angular/core";
import { Observable, map, filter, take, catchError, NEVER, of, Subject } from "rxjs";
import { assert, safeParse } from "valibot";

import { BackendService } from "../utils/backend.service.js";
import { RefCounted } from "../utils/refcounted.js";
import { WebsocketError } from "../utils/websocket-error.js";
import { WebsocketService } from "../utils/websocket.service.js";
import { Color } from "../../shared/color.js";
import { GameId } from "../../shared/game/game.js";
import { BEGIN_PATH, type BeginGameRequest } from "../../shared/lobby/begin.js";
import { CANCEL_PATH, type CancelLobbyRequest } from "../../shared/lobby/cancel.js";
import { CREATE_PATH, CreateLobbyRequestSchema, type CreateLobbyRequest, type CreateLobbyResponse } from "../../shared/lobby/create.js";
import { JOIN_LOBBY_PATH, type JoinLobbyRequest, type JoinLobbyResponse } from "../../shared/lobby/join-lobby.js";
import { KICK_PLAYER_PATH, type KickPlayerRequest } from "../../shared/lobby/kick-player.js";
import { LOBBY_API_ROOT, type LobbyId, type LobbyState } from "../../shared/lobby/lobby.js";
import { MOVE_PLAYER_PATH, type MovePlayerRequest } from "../../shared/lobby/move-player.js";
import { LobbyNotificationSchema, type LobbyNotification } from "../../shared/lobby/notifications.js";
import { SET_COLOR_PATH, type SetColorRequest } from "../../shared/lobby/set-color.js";
import { SUBSCRIBE_PATH, type SubscribeRequest } from "../../shared/lobby/subscribe.js";
import { PrivateId, PublicId } from "../../shared/player.js";
import { QUESTIONS_API_ROOT } from "../../shared/questions/questions.js";
import { GET_QUESTION_SETS_PATH, GetQuestionSetsResponse } from "../../shared/questions/get-question-sets.js";
import { WebSocketRequest } from "../../shared/websocket.interface.js";


@Injectable({providedIn: "root"})
export class LobbyService {
	private readonly lobbyInstances = new Map<LobbyId, RefCounted<LobbyInstanceService>>();
	
	constructor(private backend: BackendService) {}
	
	private createLobbyInstanceService(lobbyId: LobbyId, privateId: PrivateId): RefCounted<LobbyInstanceService> {
		return new RefCounted<LobbyInstanceService>(new LobbyInstanceService(this, this.backend, lobbyId, privateId));
	}
	
	public getLobbyInstanceService(lobbyId: LobbyId, privateId: PrivateId): RefCounted<LobbyInstanceService> {
		let lobbyInstanceService = this.lobbyInstances.get(lobbyId);
		if (!lobbyInstanceService) {
			lobbyInstanceService = this.createLobbyInstanceService(lobbyId, privateId);
			this.lobbyInstances.set(lobbyId, lobbyInstanceService);
		}
		return lobbyInstanceService;
	}
	
	public createLobby(request: CreateLobbyRequest): Observable<CreateLobbyResponse> {
		assert(CreateLobbyRequestSchema, request);
		return this.backend.postJson<CreateLobbyRequest, CreateLobbyResponse>(LOBBY_API_ROOT + CREATE_PATH, request);
	}
	
	public joinLobby(lobbyId: LobbyId, name: string, privateId?: PrivateId): Observable<JoinLobbyResponse> {
		return this.backend.postJson<JoinLobbyRequest, JoinLobbyResponse>(
			LOBBY_API_ROOT + JOIN_LOBBY_PATH, { lobbyId, name, privateId });
	}
	
	public removeLobby(id: LobbyId): void {
		this.lobbyInstances.delete(id);
	}
	
	public getQuestionSets(): Observable<GetQuestionSetsResponse> {
		return this.backend.get<GetQuestionSetsResponse>(QUESTIONS_API_ROOT + GET_QUESTION_SETS_PATH);
	}
}


export class LobbyInstanceService extends WebsocketService {
	private readonly lobbyUpdate: Observable<LobbyState>;
	private readonly begin: Observable<GameId>;
	private readonly canceled: Observable<void>;
	private readonly kicked: Observable<void>;
	private readonly error: Observable<WebsocketError>;
	
	constructor(
			private readonly lobbyService: LobbyService,
			backend: BackendService,
			private readonly lobbyId: LobbyId,
			private readonly privateId: PrivateId) {
		super(LOBBY_API_ROOT + SUBSCRIBE_PATH, backend);
		
		const notifications = new Subject<LobbyNotification>();
			this.retryWsSubject.pipe(
					map(object => safeParse(LobbyNotificationSchema, object)),
					filter(parsed => parsed.success),
					map(parsed => parsed.output))
				.subscribe(notifications);
		
		this.lobbyUpdate = notifications.pipe(
			// Filter out errors. They can be caught by subscribing to the error
			// observable.
			catchError(err => NEVER),
			filter(notification => notification.type === "update"),
			map(update => update.state));
		
		this.begin = notifications.pipe(
			// Filter out errors. They can be caught by subscribing to the error
			// observable.
			catchError(err => NEVER),
			filter(notification => notification.type === "begin-game"),
			map(update => update.gameId),
			// take(1) instead of first() so we don't error if the connection is
			// closed before receiving a value.
			take(1));
		
		this.canceled = notifications.pipe(
			// Filter out errors. They can be caught by subscribing to the error
			// observable.
			catchError(err => NEVER),
			filter(notification => notification.type === "canceled"),
			map(_ => undefined),
			// take(1) instead of first() so we don't error if the connection is
			// closed before receiving a value.
			take(1));
		
		this.kicked = notifications.pipe(
			// Filter out errors. They can be caught by subscribing to the error
			// observable.
			catchError(err => NEVER),
			filter(notification => notification.type === "kicked"),
			map(_ => undefined),
			// take(1) instead of first() so we don't error if the connection is
			// closed before receiving a value.
			take(1));
		
		this.error = notifications.pipe(
			filter(notification => notification.type === "error"),
			map(err => new WebsocketError(err.status, err.message)),
			catchError(err => {
				if (err instanceof CloseEvent) {
					// TODO: Attempt reconnection?
					return of(new WebsocketError(500, `Server unexpectedly closed the connection: ${err}`))
				} else {
					return of(new WebsocketError(0, `Unknown error occured: ${err}`));
				};
			}));
	}
	
	protected override onOpen(event: Event): void {
		this.wsSubject.next({
			method: "subscribe",
			payload: {
				lobbyId: this.lobbyId,
				privateId: this.privateId,
			}
		} satisfies WebSocketRequest<SubscribeRequest>);
	}
	
	protected override onClose(): void {
		this.lobbyService.removeLobby(this.lobbyId);
	}
	
	public kickPlayer(player: PublicId): Observable<void> {
		return this.backend.postJson<KickPlayerRequest, void>(LOBBY_API_ROOT + KICK_PLAYER_PATH, {
			lobbyId: this.lobbyId,
			player: player,
			requester: this.privateId
		});
	}
	
	public movePlayer(player: PublicId, role: "player" | "spectator"): Observable<void> {
		return this.backend.postJson<MovePlayerRequest, void>(LOBBY_API_ROOT + MOVE_PLAYER_PATH, {
			lobbyId: this.lobbyId,
			player: player,
			role: role,
			requester: this.privateId
		});
	}
	
	public setColor(player: PublicId, color: Color): Observable<void> {
		return this.backend.postJson<SetColorRequest, void>(LOBBY_API_ROOT + SET_COLOR_PATH, {
			lobbyId: this.lobbyId,
			player: player,
			color: color,
			requester: this.privateId
		});
	}
	
	public beginGame(): Observable<void> {
		return this.backend.postJson<BeginGameRequest, void>(LOBBY_API_ROOT + BEGIN_PATH, {
			lobbyId: this.lobbyId,
			requester: this.privateId
		});
	}
	
	public cancelLobby(): Observable<void> {
		return this.backend.postJson<CancelLobbyRequest, void>(LOBBY_API_ROOT + CANCEL_PATH, {
			lobbyId: this.lobbyId,
			requester: this.privateId
		});
	}
	
	public onLobbyUpdate(): Observable<LobbyState> {
		return this.lobbyUpdate;
	}
	
	public onBeginGame(): Observable<GameId> {
		return this.begin;
	}
	
	public onCanceled(): Observable<void> {
		return this.canceled;
	}
	
	public onKicked(): Observable<void> {
		return this.kicked;
	}
	
	public onError(): Observable<WebsocketError> {
		return this.error;
	}
};
