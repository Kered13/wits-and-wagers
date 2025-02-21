import express, { Router, type Request, type Response } from "express";
import { assert } from "valibot";
import { type WebSocket } from "ws";

import { Lobby } from "./lobby.js";
import { type GameApp } from "../game/app.js";
import { HttpError } from "../utils/httperror.js";
import { Notifier } from "../utils/notifier.js";
import { verifyRequest } from "../utils/verifyrequest.js";
import { WebSocketUtil } from "../utils/websocket.js";
import { BEGIN_PATH, BeginGameRequestSchema } from "../../shared/lobby/begin.js";
import { CANCEL_PATH, CancelLobbyRequestSchema } from "../../shared/lobby/cancel.js";
import { JOIN_LOBBY_PATH, JoinLobbyRequestSchema, type JoinLobbyResponse, } from "../../shared/lobby/joinlobby.js";
import { type LobbyId } from "../../shared/lobby/lobby.js";
import { CREATE_PATH, CreateLobbyRequestSchema, CreateLobbyResponseSchema, type CreateLobbyResponse } from "../../shared/lobby/create.js";
import { type LobbyNotification } from "../../shared/lobby/notifications.js";
import { SUBSCRIBE_PATH, SubscribeRequestSchema } from "../../shared/lobby/subscribe.js";
import { type PrivateId } from "../../shared/player.js";
import type { WsError } from "../../shared/ws-error.js";


class LobbyNotifier extends Notifier<LobbyNotification> {}


type LobbyData = {
	lobby: Lobby,
	notifier: LobbyNotifier
};


export class LobbyApp {
	private readonly lobbies: Map<LobbyId, LobbyData> = new Map();
	private lobbyCounter: number = 0;
	
	constructor(private readonly gameApp: GameApp) {}
	
	private verifyHost(lobby: Lobby, requester: PrivateId): void {
		if (!lobby.isHost(requester)) {
			throw new HttpError(403, "Only the lobby host may begin the game.");
		}
	}
	
	private tryGetLobby(id: LobbyId): LobbyData | undefined {
		return this.lobbies.get(id);
	}
	
	private getLobby(id: LobbyId): LobbyData {
		const data = this.tryGetLobby(id);
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
	
	private joinLobby(req: Request, res: Response): void {
		const request = verifyRequest(
			req.body, JoinLobbyRequestSchema, `Invalid JoinLobbyRequest: ${req.body}`);
		
		const data = this.tryGetLobby(request.lobbyId);
		if (!data) {
			// Check if the lobby has become a game, and if this player is part
			// of that game. Then redirect them to the game.
			const gameData = this.gameApp.tryGetGame(Lobby.gameIdFromLobbyId(request.lobbyId));
			if (!gameData || !request.privateId || !gameData.game.getPlayers().hasPrivatePlayer(request.privateId)) {
				throw new HttpError(404, `LobbyId ${request.lobbyId} not found.`);
			}
			res.send({
				gameId: gameData.game.getId()
			} satisfies JoinLobbyResponse);
			return;
		}
		
		const { lobby, notifier } = data;
		const player = lobby.addPlayer(request.name, request.privateId);
		
		res.send({
			player: player.toPrivateJson()
		} satisfies JoinLobbyResponse);
		
		notifier.notifyClients(lobby.makeUpdate());
	}
	
	private beginGame(req: Request, res: Response): void {
		const request = verifyRequest(
			req.body, BeginGameRequestSchema, `Invalid BeginGameRequest: ${req.body}`);
		
		const { lobby, notifier } = this.getLobby(request.lobbyId);
		this.verifyHost(lobby, request.requester);
		
		this.removeLobby(lobby);
		const [game, beginGame] = lobby.beginGame();
		this.gameApp.addGame(game);
		
		res.end();
		notifier
			.notifyClients(beginGame)
			.close();
	}
	
	private cancel(req: Request, res: Response): void {
		const request = verifyRequest(
			req.body, CancelLobbyRequestSchema, `Invalid CancelLobbyRequest: ${req.body}`);
		
		const { lobby, notifier } = this.getLobby(request.lobbyId);
		this.verifyHost(lobby, request.requester);
		
		this.removeLobby(lobby);
		
		res.end();
		notifier
			.notifyClients(lobby.makeCancel())
			.close();
	}
	
	private subscribe(webSocket: WebSocket): void {
		const ws = new WebSocketUtil(webSocket);
		ws.onMethod("subscribe", (msg: unknown) => {
			console.log("WS /api/lobby/subscribe " + JSON.stringify(msg));
			
			try {
				const { privateId, lobbyId } = verifyRequest(
					msg, SubscribeRequestSchema, `Invalid SubscribeRequest: ${msg}`);
				
				const { lobby, notifier } = this.getLobby(lobbyId);
				notifier.addClient(privateId, ws);
				notifier.notifyClient(ws, lobby.makeUpdate());
				
				ws.onClose(() => {
					notifier.removeClient(privateId, ws);
					if (!notifier.hasClients(privateId)) {
						if (privateId === lobby.getHost().privateId) {
							this.removeLobby(lobby);
							
							notifier
								.notifyClients(lobby.makeCancel())
								.close();
						} else {
							lobby.removePlayer(privateId);
							notifier.notifyClients(lobby.makeUpdate());
						}
					}
				});
			} catch (err) {
				if (err instanceof HttpError) {
					console.error(err.message);
					ws.error(err.status, err.message);
					ws.close();
				}
			}
		});
	}
	
	public getRouter(): Router {
		return express.Router()
			.post(CREATE_PATH, (req, res) => this.create(req, res))
			.post(JOIN_LOBBY_PATH, (req, res) => this.joinLobby(req, res))
			.post(BEGIN_PATH, (req, res) => this.beginGame(req, res))
			.post(CANCEL_PATH, (req, res) => this.cancel(req, res))
			.ws(SUBSCRIBE_PATH, ws => this.subscribe(ws));
	}
}
