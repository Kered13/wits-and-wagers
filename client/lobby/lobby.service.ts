import { Injectable } from "@angular/core";
import { Observable, map, filter, take } from "rxjs";
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { assert, is } from "valibot";

import { BackendService } from "../utils/backend.service.js";
import { Closeable, RefCounted } from "../utils/refcounted.js";
import { WebsocketError } from "../utils/websocket-error.js";
import { GameId } from "../../shared/game/game.js";
import { BEGIN_PATH, type BeginGameRequest } from "../../shared/lobby/begin.js";
import { CANCEL_PATH, type CancelLobbyRequest } from "../../shared/lobby/cancel.js";
import { CREATE_PATH, CreateLobbyRequestSchema, type CreateLobbyRequest, type CreateLobbyResponse } from "../../shared/lobby/create.js";
import { type JoinLobbyRequest, type JoinLobbyResponse } from "../../shared/lobby/joinlobby.js";
import { LOBBY_API_ROOT, type LobbyId, type LobbyJson } from "../../shared/lobby/lobby.js";
import { LobbyNotificationSchema, type LobbyNotification } from "../../shared/lobby/notifications.js";
import { SUBSCRIBE_PATH, type SubscribeRequest } from "../../shared/lobby/subscribe.js";
import { PrivateId } from "../../shared/player.js";


@Injectable({providedIn: "root"})
export class LobbyService {
	private readonly lobbyInstances = new Map<PrivateId, RefCounted<LobbyInstanceService>>();
	
	constructor(private backend: BackendService) {}
	
	private createLobbyInstanceService(lobbyId: LobbyId, privateId: PrivateId): RefCounted<LobbyInstanceService> {
		return new RefCounted<LobbyInstanceService>(new LobbyInstanceService(this, this.backend, lobbyId, privateId));
	}
	
	public getLobbyInstanceService(lobbyId: LobbyId, privateId: PrivateId): RefCounted<LobbyInstanceService> {
		let lobbyInstanceService = this.lobbyInstances.get(privateId);
		if (!lobbyInstanceService) {
			lobbyInstanceService = this.createLobbyInstanceService(lobbyId, privateId);
			this.lobbyInstances.set(privateId, lobbyInstanceService);
		}
		return lobbyInstanceService;
	}
	
	public createLobby(request: CreateLobbyRequest): Observable<CreateLobbyResponse> {
		assert(CreateLobbyRequestSchema, request);
		return this.backend.postJson<CreateLobbyRequest, CreateLobbyResponse>(LOBBY_API_ROOT + CREATE_PATH, request);
	}
	
	public joinLobby(lobbyId: LobbyId, name: string, privateId?: PrivateId): Observable<JoinLobbyResponse> {
		return this.backend.postJson<JoinLobbyRequest, JoinLobbyResponse>(
			"/api/lobby/joinlobby",
			{
				lobbyId: lobbyId,
				name: name,
				privateId: privateId
			});
	}
	
	public removeLobby(id: LobbyId): void {
		this.lobbyInstances.delete(id);
	}
}


export class LobbyInstanceService extends Closeable {
	private readonly wsSubject: WebSocketSubject<Object>;
	private readonly lobbyUpdate: Observable<LobbyJson>;
	private readonly begin: Observable<GameId>;
	private readonly canceled: Observable<void>;
	private readonly error: Observable<WebsocketError>;
	
	constructor(
			private readonly lobbyService: LobbyService,
			private readonly backend: BackendService,
			private readonly lobbyId: LobbyId,
			private readonly privateId: PrivateId) {
		super();
		
		this.wsSubject = this.backend.webSocket(LOBBY_API_ROOT + SUBSCRIBE_PATH);
		this.wsSubject.next({
			method: "subscribe",
			payload: {
				lobbyId: this.lobbyId,
				privateId: this.privateId,
			} satisfies SubscribeRequest
		});
		
		const notifications: Observable<LobbyNotification> =
			this.wsSubject.pipe(filter(object => is(LobbyNotificationSchema, object)));
		
		this.lobbyUpdate = notifications.pipe(
			filter(notification => notification.type === "update"),
			map(update => update.state));
		
		this.begin = notifications.pipe(
			filter(notification => notification.type === "begin-game"),
			map(update => update.gameId),
			// take(1) instead of first() so we don't error when the connection is closed.
			take(1));
		
		this.canceled = notifications.pipe(
			filter(notification => notification.type === "canceled"),
			map(_ => undefined),
			// take(1) instead of first() so we don't error when the connection is closed.
			take(1));
		
		this.error = notifications.pipe(
			filter(notification => notification.type === "error"),
			map(err => new WebsocketError(err.status, err.message)));
		
		// If the server closes the connection, close this lobby. This does not
		// handle unexpected closures like the server crashing.
		this.wsSubject.subscribe({ complete: () => this.close() });
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
	
	public onLobbyUpdate(): Observable<LobbyJson> {
		return this.lobbyUpdate;
	}
	
	public onBeginGame(): Observable<GameId> {
		return this.begin;
	}
	
	public onCanceled(): Observable<void> {
		return this.canceled;
	}
	
	public onError(): Observable<WebsocketError> {
		return this.error;
	}
	
	public override doClose(): void {
		this.wsSubject.complete();
		this.lobbyService.removeLobby(this.lobbyId);
		console.log("Closed LobbyInstanceService");
	}
};
