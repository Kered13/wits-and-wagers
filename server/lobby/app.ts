import express, { Router, type Request, type Response } from "express";
import { assert } from "valibot";
import type { WebSocket } from "ws";

import { Lobby } from "./lobby.js";
import type { GameApp } from "../game/app.js";
import { HttpError } from "../utils/httperror.js";
import { Notifier } from "../utils/notifier.js";
import { verifyRequest } from "../utils/verifyrequest.js";
import { WebSocketUtil } from "../utils/websocket.js";
import { LobbyIdSchema, type LobbyId } from "../../shared/lobby/lobby.js";
import { AddPlayerRequestSchema, type AddPlayerResponse, } from "../../shared/lobby/addplayer.js";
import { BeginGameRequestSchema } from "../../shared/lobby/begin.js";
import { CancelLobbyRequestSchema } from "../../shared/lobby/cancel.js";
import { CreateLobbyRequestSchema, CreateLobbyResponseSchema, type CreateLobbyResponse } from "../../shared/lobby/create.js";
import type { LobbyNotification } from "../../shared/lobby/notifications.js";
import type { PrivateId } from "../../shared/player.js";


class LobbyNotifier extends Notifier<LobbyNotification> {}


type LobbyData = {
	lobby: Lobby,
	notifier: LobbyNotifier
};


export class LobbyApp {
	// TODO: This should not be public.
	public readonly lobbies: Map<LobbyId, LobbyData> = new Map();
	
	private lobbyCounter: number = 0;
	
	constructor(private readonly gameApp: GameApp) {}
	
	private verifyHost(lobby: Lobby, requester: PrivateId): void {
		if (!lobby.isHost(requester)) {
			throw new HttpError(403, "Only the lobby host may begin the game.");
		}
	}
	
	private getLobby(id: LobbyId): LobbyData {
		const data = this.lobbies.get(id);
		if (!data) {
			throw new HttpError(404, `LobbyId ${id} not found.`);
		}
		return data;
	}
	
	private removeLobby(lobby: Lobby): void {
		this.lobbies.delete(lobby.getId());
	}
	
	// TODO
	private createLobbyId(): LobbyId {
		return "game" + this.lobbyCounter++;
	}
	
	private create(req: Request, res: Response): void {
		console.log("POST /api/lobby/create " + JSON.stringify(req.body));
		
		const request = verifyRequest(
			req.body, CreateLobbyRequestSchema, `Invalid CreateLobbyRequest: ${req.body}`);
		
		const lobby = new Lobby(this.createLobbyId(), request.title, request.host);
		this.lobbies.set(lobby.getId(), { lobby: lobby, notifier: new LobbyNotifier });
		
		const response: CreateLobbyResponse = {
			id: lobby.getId(),
			host: lobby.getHost().toPrivateJson()
		};
		assert(CreateLobbyResponseSchema, response);
		res.send(response);
	}
	
	private addplayer(req: Request, res: Response): void {
		console.log("POST /api/lobby/addplayer " + JSON.stringify(req.body));
		
		const request = verifyRequest(
			req.body, AddPlayerRequestSchema, `Invalid AddPlayerRequest: ${req.body}`);
		
		const { lobby, notifier } = this.getLobby(request.lobbyId);
		const player = lobby.addPlayer(request.name);
		
		const response: AddPlayerResponse = {
			player: player.toPrivateJson()
		};
		res.send(response);
		
		notifier.notifyClients(lobby.makeUpdate());
	}
	
	private beginGame(req: Request, res: Response): void {
		console.log("POST /api/lobby/begin " + JSON.stringify(req.body));
		
		const request = verifyRequest(
			req.body, BeginGameRequestSchema, `Invalid BeginGameRequest: ${req.body}`);
		
		const { lobby, notifier } = this.getLobby(request.lobbyId);
		this.verifyHost(lobby, request.requester);
		
		this.removeLobby(lobby);
		this.gameApp.addGame(lobby.beginGame());
		
		res.end();
		notifier.notifyClients(lobby.makeBeginGame());
	}
	
	private cancel(req: Request, res: Response): void {
		console.log("POST /api/lobby/cancel " + JSON.stringify(req.body));
		
		const request = verifyRequest(
			req.body, CancelLobbyRequestSchema, `Invalid CancelLobbyRequest: ${req.body}`);
		
		const { lobby, notifier } = this.getLobby(request.lobbyId);
		this.verifyHost(lobby, request.requester);
		
		this.removeLobby(lobby);
		
		res.end();
		notifier.notifyClients(lobby.makeCancel());
	}
	
	private wsState(webSocket: WebSocket): void {
		const ws = new WebSocketUtil(webSocket);
		ws.onMethod("register", (msg: unknown) => {
			console.log("WS /api/lobby/state " + JSON.stringify(msg));
			
			const lobbyId = verifyRequest(
				msg, LobbyIdSchema, `${msg} is not a valid LobbyId.`);
			
			const { lobby, notifier } = this.getLobby(lobbyId);
			notifier.addClient(ws);
			notifier.notifyClient(ws, lobby.makeUpdate());
			
			ws.onClose(() => {
				notifier.removeClient(ws);
			});
		});
	}
	
	public getRouter(): Router {
		return express.Router()
			.post("/create", (req, res) => this.create(req, res))
			.post("/addplayer", (req, res) => this.addplayer(req, res))
			.post("/begin", (req, res) => this.beginGame(req, res))
			.post("/cancel", (req, res) => this.cancel(req, res))
			.ws("/state", ws => this.wsState(ws));
	}
}