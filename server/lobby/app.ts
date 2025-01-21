import express, { Router, type Request, type Response } from "express";
import { assert, is } from "valibot";
import type { WebSocket } from "ws";

import { Lobby } from "./lobby.js";
import type { GameApp } from "../game/app.js";
import { HttpError } from "../utils/httperror.js";
import { Notifier } from "../utils/notifier.js";
import { WebSocketUtil } from "../utils/websocket.js";
import { LobbyIdSchema, type LobbyId } from "../../shared/lobby/lobby.js";
import { AddPlayerRequestSchema, type AddPlayerResponse, } from "../../shared/lobby/addplayer.js";
import { BeginGameRequestSchema } from "../../shared/lobby/begin.js";
import { CancelLobbyRequestSchema } from "../../shared/lobby/cancel.js";
import { CreateLobbyRequestSchema, CreateLobbyResponseSchema, type CreateLobbyResponse } from "../../shared/lobby/create.js";
import type { LobbyNotification } from "../../shared/lobby/notifications.js";


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
		
		if (!is(CreateLobbyRequestSchema, req.body)) {
			throw new HttpError(400, `Invalid CreateLobbyRequest: ${req.body}`);
		}
		
		const lobby = new Lobby(this.createLobbyId(), req.body.title, req.body.host);
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
		
		if (!is(AddPlayerRequestSchema, req.body)) {
			throw new HttpError(400, `Invalid AddPlayerRequest: ${req.body}`);
		}
		
		const { lobby, notifier } = this.getLobby(req.body.lobbyId);
		const player = lobby.addPlayer(req.body.name);
		
		const response: AddPlayerResponse = {
			player: player.toPrivateJson()
		};
		res.send(response);
		
		notifier.notifyClients(lobby.makeUpdate());
	}
	
	private beginGame(req: Request, res: Response): void {
		console.log("POST /api/lobby/begin " + JSON.stringify(req.body));
		if (!is(BeginGameRequestSchema, req.body)) {
			throw new HttpError(400, `${req.body} is not a valid LobbyId.`);
		}
		
		const { lobby, notifier } = this.getLobby(req.body);
		this.removeLobby(lobby);
		
		const game = lobby.createGame();
		this.gameApp.addGame(game);
		
		res.end();
		notifier.notifyClients(lobby.makeBeginGame());
	}
	
	private cancel(req: Request, res: Response): void {
		console.log("POST /api/lobby/cancel " + JSON.stringify(req.body));
		if (!is(CancelLobbyRequestSchema, req.body)) {
			throw new HttpError(400, `${req.body} is not a valid LobbyId.`);
		}
		
		const { lobby, notifier } = this.getLobby(req.body);
		this.removeLobby(lobby);
		
		res.end();
		notifier.notifyClients(lobby.makeCancel());
	}
	
	private wsState(webSocket: WebSocket): void {
		const ws = new WebSocketUtil(webSocket);
		ws.onMethod("register", (msg: unknown) => {
			console.log("WS /api/lobby/state " + JSON.stringify(msg));
			
			if (!is(LobbyIdSchema, msg)) {
				throw new HttpError(400, `${msg} is not a valid LobbyId.`);
			}
			
			const { lobby, notifier } = this.getLobby(msg);
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