import { Injectable, signal, Signal, WritableSignal } from "@angular/core";
import { Observable, map, filter } from "rxjs";
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { assert, is } from "valibot";

import { HttpService } from "../utils/http.service.js";
import { type AddPlayerRequest, type AddPlayerResponse } from "../../shared/lobby/addplayer.js";
import { CreateLobbyRequestSchema, type CreateLobbyRequest, type CreateLobbyResponse } from "../../shared/lobby/create.js";
import { type LobbyId, type LobbyJson } from "../../shared/lobby/lobby.js";
import { LobbyNotificationSchema, type LobbyNotification } from "../../shared/lobby/update.js";
import { PrivatePlayer } from "../../shared/player.js";


@Injectable({providedIn: "root"})
export class LobbyService {
	private lobbyInstances: Map<LobbyId, LobbyInstanceService> = new Map<LobbyId, LobbyInstanceService>();
	
	constructor(private http: HttpService) {}
	
	private createLobbyInstanceService(id: LobbyId): LobbyInstanceService {
		return new LobbyInstanceService(this.http, id);
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
		return this.http.postJson<CreateLobbyRequest, CreateLobbyResponse>("http://localhost:3000/api/lobby/create", request);
	}
}


export class LobbyInstanceService {
	public readonly lobbyState: Signal<LobbyJson>;
	
	private lobbyUpdates: WritableSignal<LobbyJson>;
	
	constructor(private http: HttpService, private id: LobbyId) {
		const wsSubject: WebSocketSubject<Object> = webSocket("ws://localhost:3000/api/lobby/state");
		wsSubject.next({
			method: "register",
			payload: this.id
		});
		
		const notifications: Observable<LobbyNotification> =
			wsSubject.pipe(filter(object => is(LobbyNotificationSchema, object)));
		
		this.lobbyUpdates = signal({ title: "", host: "", players: []});
		notifications
			.pipe(filter(notification => notification.type === "update"),
			      map(update => update.state))
			.subscribe(state => this.lobbyUpdates.set(state));
		
		this.lobbyState = this.lobbyUpdates;
	}
	
	public addPlayer(name: string): Observable<PrivatePlayer> {
		return this.http.postJson<AddPlayerRequest, AddPlayerResponse>("http://localhost:3000/api/lobby/addplayer", { lobbyId: this.id, name: name })
			.pipe(map(response => response.player));
	}
};
