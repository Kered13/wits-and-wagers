import { Injectable } from "@angular/core";
import { Observable, map, filter, take } from "rxjs";
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { assert, is } from "valibot";

import { BackendService } from "../utils/backend.service.js";
import { Closeable, RefCounted } from "../utils/refcounted.js";
import { type AddPlayerRequest, type AddPlayerResponse } from "../../shared/lobby/addplayer.js";
import { type BeginGameRequest } from "../../shared/lobby/begin.js";
import { type CancelLobbyRequest } from "../../shared/lobby/cancel.js";
import { CreateLobbyRequestSchema, type CreateLobbyRequest, type CreateLobbyResponse } from "../../shared/lobby/create.js";
import { type LobbyId, type LobbyJson } from "../../shared/lobby/lobby.js";
import { LobbyError, LobbyNotificationSchema, type LobbyNotification } from "../../shared/lobby/notifications.js";
import { type SubscribeRequest } from "../../shared/lobby/subscribe.js";
import { PrivateId, PrivatePlayer } from "../../shared/player.js";
import { GameId } from "../../shared/game/game.js";


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
		return this.backend.postJson<CreateLobbyRequest, CreateLobbyResponse>("/api/lobby/create", request);
	}
	
	public addPlayer(lobbyId: LobbyId, name: string): Observable<PrivatePlayer> {
		return this.backend.postJson<AddPlayerRequest, AddPlayerResponse>("/api/lobby/addplayer", { lobbyId: lobbyId, name: name })
			.pipe(map(response => response.player));
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
	private readonly error: Observable<LobbyError>;
	
	constructor(
			private readonly lobbyService: LobbyService,
			private readonly http: BackendService,
			private readonly lobbyId: LobbyId,
			private readonly privateId: PrivateId) {
		super();
		
		this.wsSubject = webSocket("ws://localhost:3000/api/lobby/state");
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
			filter(notification => notification.type === "error"));
		
		// If the server closes the connection, close this lobby. This does not
		// handle unexpected closures like the server crashing.
		this.wsSubject.subscribe({ complete: () => this.close() });
	}
	
	public beginGame(): Observable<void> {
		return this.http.postJson<BeginGameRequest, void>("/api/lobby/begin", {
			lobbyId: this.lobbyId,
			requester: this.privateId
		});
	}
	
	public cancelLobby(): Observable<void> {
		return this.http.postJson<CancelLobbyRequest, void>("/api/lobby/cancel", {
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
	
	public onError(): Observable<LobbyError> {
		return this.error;
	}
	
	public override doClose(): void {
		this.wsSubject.complete();
		this.lobbyService.removeLobby(this.lobbyId);
		console.log("Closed LobbyInstanceService");
	}
};
