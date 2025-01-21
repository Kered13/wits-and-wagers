import { Injectable } from "@angular/core";
import { Observable, map, filter, first, firstValueFrom } from "rxjs";
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { assert, is } from "valibot";

import { BackendService } from "../utils/backend.service.js";
import { type AddPlayerRequest, type AddPlayerResponse } from "../../shared/lobby/addplayer.js";
import { type BeginGameRequest } from "../../shared/lobby/begin.js";
import { type CancelLobbyRequest } from "../../shared/lobby/cancel.js";
import { CreateLobbyRequestSchema, type CreateLobbyRequest, type CreateLobbyResponse } from "../../shared/lobby/create.js";
import { type LobbyId, type LobbyJson } from "../../shared/lobby/lobby.js";
import { LobbyNotificationSchema, type LobbyNotification } from "../../shared/lobby/notifications.js";
import { PrivatePlayer } from "../../shared/player.js";
import { GameId } from "../../shared/game/game.js";


@Injectable({providedIn: "root"})
export class LobbyService {
	private readonly lobbyInstances: Map<LobbyId, LobbyInstanceService> = new Map<LobbyId, LobbyInstanceService>();
	
	constructor(private backend: BackendService) {}
	
	private createLobbyInstanceService(id: LobbyId): LobbyInstanceService {
		return new LobbyInstanceService(this.backend, id);
	}
	
	getLobbyInstanceService(id: LobbyId): LobbyInstanceService {
		let lobbyInstanceService = this.lobbyInstances.get(id);
		if (!lobbyInstanceService) {
			lobbyInstanceService = this.createLobbyInstanceService(id);
			this.lobbyInstances.set(id, lobbyInstanceService);
		}
		return lobbyInstanceService;
	}
	
	createLobby(request: CreateLobbyRequest): Observable<CreateLobbyResponse> {
		assert(CreateLobbyRequestSchema, request);
		return this.backend.postJson<CreateLobbyRequest, CreateLobbyResponse>("/api/lobby/create", request);
	}
}


export class LobbyInstanceService {
	private readonly lobbyUpdate: Observable<LobbyJson>;
	private readonly begin: Observable<GameId>;
	private readonly canceled: Observable<void>;
	
	constructor(private http: BackendService, private id: LobbyId) {
		const wsSubject: WebSocketSubject<Object> = webSocket("ws://localhost:3000/api/lobby/state");
		wsSubject.next({
			method: "register",
			payload: this.id
		});
		
		const notifications: Observable<LobbyNotification> =
			wsSubject.pipe(filter(object => is(LobbyNotificationSchema, object)));
		
		this.lobbyUpdate = notifications.pipe(
			filter(notification => notification.type === "update"),
			map(update => update.state));
		
		this.begin = notifications.pipe(
			filter(notification => notification.type === "begin-game"),
			map(update => update.gameId),
			first());
		
		this.canceled = notifications.pipe(
			filter(notification => notification.type == "canceled"),
			map(_ => undefined),
			first());
	}
	
	public addPlayer(name: string): Observable<PrivatePlayer> {
		return this.http.postJson<AddPlayerRequest, AddPlayerResponse>("/api/lobby/addplayer", { lobbyId: this.id, name: name })
			.pipe(map(response => response.player));
	}
	
	public beginGame(requester: PrivatePlayer): Observable<void> {
		return this.http.postJson<BeginGameRequest, void>("/api/lobby/begin", {
			lobbyId: this.id,
			requester: requester.privateId
		});
	}
	
	public cancelLobby(requester: PrivatePlayer): Observable<void> {
		return this.http.postJson<CancelLobbyRequest, void>("/api/lobby/cancel", {
			lobbyId: this.id,
			requester: requester.privateId
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
};
