import express, { Router, type Request, type Response } from "express";
import { assert, is } from "valibot";
import type { WebSocket } from "ws";

import { Lobby } from "./lobby.js";
import { HttpError } from "../utils/httperror.js";
import { Notifier } from "../utils/notifier.js";
import { WebSocketUtil } from "../utils/websocket.js";
import { LobbyIdSchema, type LobbyId, type LobbyJson } from "../../shared/lobby/lobby.js";
import { AddPlayerRequestSchema, AddPlayerResponseSchema, type AddPlayerResponse, } from "../../shared/lobby/addplayer.js";
import { CreateLobbyRequestSchema, CreateLobbyResponseSchema, type CreateLobbyResponse } from "../../shared/lobby/create.js";


class LobbyNotifier extends Notifier<LobbyJson, Lobby, LobbyId> { }


export class LobbyApp {
	// TODO: This should not be public.
	public readonly lobbies: Map<LobbyId, LobbyNotifier> = new Map();
	
	public getLobby(lobbyId: LobbyId): LobbyNotifier | undefined {
		return this.lobbies.get(lobbyId);
	}
	
	// TODO
	private createLobbyId(): string {
		return "game" + this.lobbies.size;
	}
	
	private create(req: Request, res: Response): void {
		console.log("POST /api/lobby/create " + JSON.stringify(req.body));
		
		if (!is(CreateLobbyRequestSchema, req.body)) {
			throw new HttpError(400, `Invalid CreateLobbyRequest: ${req.body}`);
		}
		
		const lobbyNotifier = new LobbyNotifier(this.createLobbyId(), new Lobby(req.body.title, req.body.host));
		this.lobbies.set(lobbyNotifier.id, lobbyNotifier);
		
		const response: CreateLobbyResponse = {
			id: lobbyNotifier.id,
			host: lobbyNotifier.state.getHost().toPrivateJson()
		};
		assert(CreateLobbyResponseSchema, response);
		res.send(response);
	}
	
	private addplayer(req: Request, res: Response): void {
		console.log("POST /api/lobby/addplayer " + JSON.stringify(req.body));
		
		if (!is(AddPlayerRequestSchema, req.body)) {
			throw new HttpError(400, `Invalid AddPlayerRequest: ${req.body}`);
		}
		
		const lobbyNotifier = this.lobbies.get(req.body.lobbyId);
		if (!lobbyNotifier) {
			throw new HttpError(404, `LobbyId ${req.body.lobbyId} not found.`);
		}
		
		const player = lobbyNotifier.state.addPlayer(req.body.name);
		
		const response: AddPlayerResponse = {
			player: player.toPrivateJson()
		};
		assert(AddPlayerResponseSchema, response);
		res.send(response);
		
		lobbyNotifier.notifyClients();
	}
	
	private wsState(webSocket: WebSocket): void {
		const ws = new WebSocketUtil(webSocket);
		ws.onMethod("register", (msg: unknown) => {
			console.log("WS /api/lobby/state " + JSON.stringify(msg));
			
			if (!is(LobbyIdSchema, msg)) {
				throw new HttpError(400, `${msg} is not a valid LobbyId.`);
			}
			
			const lobby = this.lobbies.get(msg);
			if (!lobby) {
				throw new HttpError(404, `LobbyId ${msg} not found.`);
			}
			ws.onClose(() => {
				lobby.removeClient(ws);
			});
			lobby.notifyClient(ws);
			lobby.addClient(ws);
		});
	}
	
	public getRouter(): Router {
		return express.Router()
			.post("/create", (req, res) => this.create(req, res))
			.post("/addplayer", (req, res) => this.addplayer(req, res))
			.ws("/state", ws => this.wsState(ws));
	}
}