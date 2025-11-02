import express, { Router, type Request, type Response } from "express";
import { assert, parse } from "valibot";
import { type WebSocket } from "ws";

import { Lobby } from "./lobby.js";
import { type LobbyFactory } from "./lobby-factory.js";
import { type GameApp } from "../game/app.js";
import { HttpError } from "../utils/httperror.js";
import { Notifier } from "../utils/notifier.js";
import { verifyRequest } from "../utils/verifyrequest.js";
import { WebSocketUtil } from "../utils/websocket.js";
import { BEGIN_PATH, BeginGameRequestSchema } from "../../shared/lobby/begin.js";
import { CANCEL_PATH, CancelLobbyRequestSchema } from "../../shared/lobby/cancel.js";
import { CREATE_PATH, CreateLobbyRequestSchema, CreateLobbyResponseSchema, type CreateLobbyResponse } from "../../shared/lobby/create.js";
import { JOIN_LOBBY_PATH, JoinLobbyRequestSchema, type JoinLobbyResponse, } from "../../shared/lobby/join-lobby.js";
import { KICK_PLAYER_PATH, KickPlayerRequestSchema } from "../../shared/lobby/kick-player.js";
import { LobbyIdSchema, type LobbyId } from "../../shared/lobby/lobby.js";
import { MOVE_PLAYER_PATH, MovePlayerRequestSchema } from "../../shared/lobby/move-player.js";
import { type LobbyNotification } from "../../shared/lobby/notifications.js";
import { SUBSCRIBE_PATH, SubscribeRequestSchema } from "../../shared/lobby/subscribe.js";
import { SET_COLOR_PATH, SetColorRequestSchema } from "../../shared/lobby/set-color.js";
import { type PrivateId } from "../../shared/player.js";
import { type Subscription } from "rxjs";


const LOBBY_GARBAGE_COLLECTION_TIMEOUT_MS = 30*60*1000;


class LobbyNotifier extends Notifier<LobbyNotification> {}


type LobbyData = {
	lobby: Lobby,
	notifier: LobbyNotifier
};


export class LobbyApp {
	private readonly lobbies: Map<LobbyId, LobbyData> = new Map();
	private readonly spectatorLobbies: Map<LobbyId, LobbyData> = new Map();
	private lobbyCounter: number = 0;
	
	constructor(
		private readonly gameApp: GameApp,
		private readonly lobbyFactory: LobbyFactory) {}
	
	private verifyHost(lobby: Lobby, requester: PrivateId): void {
		if (!lobby.isHost(requester)) {
			throw new HttpError(403, "Only the lobby host may begin the game.");
		}
	}
	
	private static tryGetLobby(lobbies: Map<LobbyId, LobbyData>, id: LobbyId): LobbyData | undefined {
		return lobbies.get(id);
	}
	
	private tryGetAnyLobby(id: LobbyId): LobbyData | undefined {
		return LobbyApp.tryGetLobby(this.lobbies, id) || LobbyApp.tryGetLobby(this.spectatorLobbies, id);
	}
	
	private getAnyLobby(id: LobbyId): LobbyData {
		const data = this.tryGetAnyLobby(id);
		if (!data) {
			throw new HttpError(404, `LobbyId ${id} not found.`);
		}
		return data;
	}
	
	private addLobby(lobby: Lobby): void {
		const notifier = new LobbyNotifier();
		this.lobbies.set(lobby.getId(), { lobby, notifier });
		this.spectatorLobbies.set(lobby.getSpectatorId(), { lobby, notifier });
		
		let sub: Subscription;
		let timeout = setTimeout(() => this.deleteLobby(lobby, notifier, sub), LOBBY_GARBAGE_COLLECTION_TIMEOUT_MS);
		sub = lobby.onUpdates().subscribe({
			next: () => {
				timeout.refresh();
				notifier.notifyClients(lobby.makeUpdate());
			},
			complete: () => {
				clearTimeout(timeout);
				this.deleteLobby(lobby, notifier, sub);
			}
		});
	}
	
	private deleteLobby(lobby: Lobby, notifier: LobbyNotifier, sub: Subscription) {
		console.log(`Deleting lobby ${lobby.getId()}`);
		sub.unsubscribe();
		notifier.close();
		this.removeLobby(lobby);
	}
	
	private removeLobby(lobby: Lobby): void {
		this.lobbies.delete(lobby.getId());
		this.spectatorLobbies.delete(lobby.getSpectatorId());
	}
	
	// TODO
	private createLobbyId(): LobbyId {
		return parse(LobbyIdSchema, "game" + this.lobbyCounter++);
	}
	
	// TODO
	private createLobbySpectatorId(): LobbyId {
		return parse(LobbyIdSchema, "game-spec" + (this.lobbyCounter - 1));
	}
	
	private create(req: Request, res: Response): void {
		const request = verifyRequest(
			req.body, CreateLobbyRequestSchema, `Invalid CreateLobbyRequest: ${JSON.stringify(req.body)}`);
		
		const lobby = this.lobbyFactory.newLobby(
			this.createLobbyId(),
			this.createLobbySpectatorId(),
			request.options);
		this.addLobby(lobby);
		
		const response: CreateLobbyResponse = {
			id: lobby.getId(),
			spectatorId: lobby.getSpectatorId(),
			host: lobby.getHost(),
		};
		assert(CreateLobbyResponseSchema, response);
		res.send(response);
	}
	
	private joinLobby(req: Request, res: Response): void {
		const { lobbyId, name, privateId } = verifyRequest(
			req.body, JoinLobbyRequestSchema, `Invalid JoinLobbyRequest: ${JSON.stringify(req.body)}`);
		
		const response = this.tryJoinLobby(lobbyId, name, privateId) ??
			this.tryJoinSpectatorLobby(lobbyId, name, privateId) ??
			this.tryJoinGame(lobbyId);
		if (!response) {
			throw new HttpError(404, `LobbyId ${lobbyId} not found.`);
		}
		res.send(response);
	}
	
	private tryJoinLobby(lobbyId: LobbyId, name: string, privateId: PrivateId | undefined): JoinLobbyResponse | undefined {
		const data = LobbyApp.tryGetLobby(this.lobbies, lobbyId);
		if (!data) {
			return undefined;
		}
		
		const { lobby, notifier } = data;
		const player = lobby.addPlayer(name, privateId);
		
		return {
			player: player.toPrivateJson()
		};
	}
	
	private tryJoinSpectatorLobby(lobbyId: LobbyId, name: string, privateId: PrivateId | undefined): JoinLobbyResponse | undefined {
		const data = LobbyApp.tryGetLobby(this.spectatorLobbies, lobbyId);
		if (!data) {
			return undefined;
		}
		
		const { lobby, notifier } = data;
		const player = lobby.addSpectator(name, privateId);
		
		return {
			player: player.toPrivateJson()
		};
	}
	
	private tryJoinGame(lobbyId: LobbyId): JoinLobbyResponse | undefined {
		// Check if the lobby has become a game, then redirect them to the game.
		const gameData = this.gameApp.tryGetGame(Lobby.gameIdFromLobbyId(lobbyId));
		if (!gameData) {
			return undefined;
		}
		return {
			gameId: gameData.game.getId()
		};
	}
	
	private kickPlayer(req: Request, res: Response): void {
		const { lobbyId, player, requester } = verifyRequest(
			req.body, KickPlayerRequestSchema, `Invalid KickPlayerRequest: ${JSON.stringify(req.body)}`);
		
		const data = this.tryGetAnyLobby(lobbyId);
		if (!data) {
			throw new HttpError(404, `LobbyId ${lobbyId} not found.`);
		}
		
		const { lobby, notifier } = data;
		if (!lobby.isHost(requester)) {
			throw new HttpError(403, "Only the lobby host may kick a player.");
		}
		
		if (lobby.isHost(player)) {
			throw new HttpError(400, "The host may not kick themselves from the lobby.");
		}
		
		const privateId = lobby.getParticipant(player).privateId;
		lobby.removeParticipant(privateId);
		
		notifier
			.notifyPlayer(privateId, { type: "kicked" })
			.closeAndRemovePlayer(privateId)
			.notifyClients(data.lobby.makeUpdate());
		res.end();
	}
	
	private movePlayer(req: Request, res: Response): void {
		const { lobbyId, player, role, requester } = verifyRequest(
			req.body, MovePlayerRequestSchema, `Invalid MovePlayerRequest: ${JSON.stringify(req.body)}`);
			
		const data = this.tryGetAnyLobby(lobbyId);
		if (!data) {
			throw new HttpError(404, `LobbyId ${lobbyId} not found.`);
		}
		
		const { lobby, notifier } = data;
		if (!lobby.isHost(requester)) {
			throw new HttpError(403, "Only the lobby host may move a player.");
		}
		
		if (!lobby.hasParticipant(player)) {
			throw new HttpError(404, `Player with public ID ${player} not found in lobby.`);
		}
		
		// We don't need to provide a name for players/spectators already in the
		// lobby.
		if (role === "player") {
			lobby.addPlayer("", player);
		} else {
			lobby.addSpectator("", player);
		}
		res.end();
	}
	
	private setColor(req: Request, res: Response): void {
		const { lobbyId, player, color, requester } = verifyRequest(
			req.body, SetColorRequestSchema, `Invalid SetColorRequest: ${JSON.stringify(req.body)}`);
		
		const data = this.getAnyLobby(lobbyId);
		
		const { lobby, notifier } = data;
		if (!lobby.isHost(requester) && lobby.getPlayer(player) !== lobby.getPlayer(requester)) {
			throw new HttpError(403, "Player's color may only be changed by the host or themself.");
		}
		
		lobby.setPlayerColor(player, color);
		res.end();
	}
	
	private beginGame(req: Request, res: Response): void {
		const { lobbyId, requester } = verifyRequest(
			req.body, BeginGameRequestSchema, `Invalid BeginGameRequest: ${JSON.stringify(req.body)}`);
		
		const { lobby, notifier } = this.getAnyLobby(lobbyId);
		this.verifyHost(lobby, requester);
		
		this.removeLobby(lobby);
		const [game, beginGame] = lobby.beginGame();
		this.gameApp.addGame(game);
		notifier.notifyClients(beginGame);
		lobby.endLobby();
		
		res.end();
	}
	
	private cancel(req: Request, res: Response): void {
		const { lobbyId, requester } = verifyRequest(
			req.body, CancelLobbyRequestSchema, `Invalid CancelLobbyRequest: ${JSON.stringify(req.body)}`);
		
		const { lobby, notifier } = this.getAnyLobby(lobbyId);
		this.verifyHost(lobby, requester);
		
		this.removeLobby(lobby);
		
		notifier.notifyClients(lobby.makeCancel());
		lobby.endLobby();
		res.end();
	}
	
	private subscribe(webSocket: WebSocket): void {
		const ws = new WebSocketUtil(webSocket);
		ws.onMethod("subscribe", (msg: unknown) => {
			console.log("WS /api/lobby/subscribe " + JSON.stringify(msg));
			
			try {
				const { privateId, lobbyId } = verifyRequest(
					msg, SubscribeRequestSchema, `Invalid SubscribeRequest: ${JSON.stringify(msg)}`);
				
				// TODO: Verify that player is in lobby.
				const { lobby, notifier } = this.getAnyLobby(lobbyId);
				notifier.addClient(privateId, ws);
				notifier.notifyClient(ws, lobby.makeUpdate());
				
				ws.onClose(() => {
					if (!notifier.hasClient(ws)) {
						// Already removed.
						return;
					}
					notifier.removeClient(ws);
					if (!notifier.hasClients(privateId)) {
						if (lobby.isHost(privateId)) {
							// TODO: Uncomment when development is done.
							// notifier.notifyClients(lobby.makeCancel());
							// lobby.endLobby();
						} else {
							lobby.removeParticipant(privateId);
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
			.post(KICK_PLAYER_PATH, (req, res) => this.kickPlayer(req, res))
			.post(MOVE_PLAYER_PATH, (req, res) => this.movePlayer(req, res))
			.post(SET_COLOR_PATH, (req, res) => this.setColor(req, res))
			.post(BEGIN_PATH, (req, res) => this.beginGame(req, res))
			.post(CANCEL_PATH, (req, res) => this.cancel(req, res))
			.ws(SUBSCRIBE_PATH, ws => this.subscribe(ws));
	}
}
