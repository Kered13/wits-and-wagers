import express, { Router, type Request, type Response } from "express";
import { assert } from "valibot";
import { type WebSocket } from "ws";

import { Lobby } from "./lobby.js";
import { type GameApp } from "../game/app.js";
import { type QuestionSetManager } from "../questions/question-set-manager.js";
import { HttpError } from "../utils/httperror.js";
import { Notifier } from "../utils/notifier.js";
import { verifyRequest } from "../utils/verifyrequest.js";
import { WebSocketUtil } from "../utils/websocket.js";
import { BEGIN_PATH, BeginGameRequestSchema } from "../../shared/lobby/begin.js";
import { CANCEL_PATH, CancelLobbyRequestSchema } from "../../shared/lobby/cancel.js";
import { CREATE_PATH, CreateLobbyRequestSchema, CreateLobbyResponseSchema, type CreateLobbyResponse } from "../../shared/lobby/create.js";
import { GET_QUESTION_SETS_PATH, GetQuestionSetsRequestSchema, GetQuestionSetsResponseSchema, type GetQuestionSetsResponse } from "../../shared/lobby/get-question-sets.js";
import { JOIN_LOBBY_PATH, JoinLobbyRequestSchema, type JoinLobbyResponse, } from "../../shared/lobby/join-lobby.js";
import { KICK_PLAYER_PATH, KickPlayerRequestSchema } from "../../shared/lobby/kick-player.js";
import { type LobbyId } from "../../shared/lobby/lobby.js";
import { MOVE_PLAYER_PATH, MovePlayerRequestSchema } from "../../shared/lobby/move-player.js";
import { type LobbyNotification } from "../../shared/lobby/notifications.js";
import { SUBSCRIBE_PATH, SubscribeRequestSchema } from "../../shared/lobby/subscribe.js";
import { SET_COLOR_PATH, SetColorRequestSchema } from "../../shared/lobby/set-color.js";
import { type PrivateId } from "../../shared/player.js";


class LobbyNotifier extends Notifier<LobbyNotification> {}


type LobbyData = {
	lobby: Lobby,
	notifier: LobbyNotifier
};


export class LobbyApp {
	private readonly lobbies: Map<LobbyId, LobbyData> = new Map();
	private readonly spectatorLobbies: Map<LobbyId, LobbyData> = new Map();
	private lobbyCounter: number = 0;
	
	constructor(private readonly questionSetManager: QuestionSetManager, private readonly gameApp: GameApp) {}
	
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
	
	private removeLobby(lobby: Lobby): void {
		this.lobbies.delete(lobby.getId());
		this.spectatorLobbies.delete(lobby.getSpectatorId());
	}
	
	// TODO
	private createLobbyId(): LobbyId {
		return "game" + this.lobbyCounter++;
	}
	
	// TODO
	private createLobbySpectatorId(): LobbyId {
		return "game-spec" + (this.lobbyCounter - 1);
	}
	
	private create(req: Request, res: Response): void {
		const request = verifyRequest(
			req.body, CreateLobbyRequestSchema, `Invalid CreateLobbyRequest: ${JSON.stringify(req.body)}`);
		
		const lobby = new Lobby(
			this.createLobbyId(),
			this.createLobbySpectatorId(),
			request.title,
			request.host,
			request.questionSet,
			request.options,
			this.questionSetManager);
		const notifier = new LobbyNotifier();
		this.lobbies.set(lobby.getId(), { lobby, notifier });
		this.spectatorLobbies.set(lobby.getSpectatorId(), { lobby, notifier });
		
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
		
		if (!this.tryJoinLobby(lobbyId, name, privateId, res) &&
				!this.tryJoinSpectatorLobby(lobbyId, name, privateId, res) &&
				!this.tryJoinGame(lobbyId, privateId, res) &&
				!this.tryJoinSpectatorGame(lobbyId, name, privateId, res)) {
			throw new HttpError(404, `LobbyId ${lobbyId} not found.`);
		}
	}
	
	private tryJoinLobby(lobbyId: LobbyId, name: string, privateId: PrivateId | undefined, res: Response): boolean {
		const data = LobbyApp.tryGetLobby(this.lobbies, lobbyId);
		if (!data) {
			return false;
		}
		
		const { lobby, notifier } = data;
		const player = lobby.addPlayer(name, privateId);
		
		res.send({
			player: player.toPrivateJson()
		} satisfies JoinLobbyResponse);
		
		notifier.notifyClients(lobby.makeUpdate());
		return true;
	}
	
	private tryJoinSpectatorLobby(lobbyId: LobbyId, name: string, privateId: PrivateId | undefined, res: Response): boolean {
		const data = LobbyApp.tryGetLobby(this.spectatorLobbies, lobbyId);
		if (!data) {
			return false;
		}
		
		const { lobby, notifier } = data;
		const player = lobby.addSpectator(name, privateId);
		
		res.send({
			player: player.toPrivateJson()
		} satisfies JoinLobbyResponse);
		
		notifier.notifyClients(lobby.makeUpdate());
		return true;
	}
	
	private tryJoinGame(lobbyId: LobbyId, privateId: PrivateId | undefined, res: Response): boolean {
		// Check if the lobby has become a game, and if this player is part
		// of that game. Then redirect them to the game.
		const gameData = this.gameApp.tryGetGame(Lobby.gameIdFromLobbyId(lobbyId));
		if (!gameData || !privateId || !gameData.game.getPlayers().some(player => player.privateId === privateId)) {
			return false;
		}
		res.send({
			gameId: gameData.game.getId()
		} satisfies JoinLobbyResponse);
		
		return true;
	}
	
	private tryJoinSpectatorGame(lobbyId: LobbyId, name: string, privateId: PrivateId | undefined, res: Response): boolean {
		// Check if the lobby has become a game, then redirect them to the game.
		// Spectators can join in the middle of a game, so we do not need to
		// check if they are already part of the game.
		const gameData = this.gameApp.tryGetSpectatorGame(Lobby.gameIdFromLobbyId(lobbyId));
		if (!gameData) {
			return false;
		}
		res.send({
			gameId: gameData.game.getSpectatorId()
		} satisfies JoinLobbyResponse);
		
		return true;
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
		
		const privateId = lobby.getParticipant(player).privateId;
		lobby.removeParticipant(privateId);
		res.end();
		
		notifier
			.notifyPlayer(privateId, { type: "kicked" })
			.closeAndRemovePlayer(privateId)
			.notifyClients(data.lobby.makeUpdate());
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
		
		if (role === "player") {
			// Player is already in the lobby, so we don't need to provide a
			// name.
			lobby.addPlayer("", player);
		} else {
			// Player is already in the lobby, so we don't need to provide a name.
			lobby.addSpectator("", player);
		}
		
		res.end();
		notifier.notifyClients(data.lobby.makeUpdate());
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
		notifier.notifyClients(data.lobby.makeUpdate());
	}
	
	private beginGame(req: Request, res: Response): void {
		const { lobbyId, requester } = verifyRequest(
			req.body, BeginGameRequestSchema, `Invalid BeginGameRequest: ${JSON.stringify(req.body)}`);
		
		const { lobby, notifier } = this.getAnyLobby(lobbyId);
		this.verifyHost(lobby, requester);
		
		this.removeLobby(lobby);
		const [game, beginGame] = lobby.beginGame();
		this.gameApp.addGame(game);
		
		res.end();
		notifier
			.notifyClients(beginGame)
			.close();
	}
	
	private cancel(req: Request, res: Response): void {
		const { lobbyId, requester } = verifyRequest(
			req.body, CancelLobbyRequestSchema, `Invalid CancelLobbyRequest: ${JSON.stringify(req.body)}`);
		
		const { lobby, notifier } = this.getAnyLobby(lobbyId);
		this.verifyHost(lobby, requester);
		
		this.removeLobby(lobby);
		
		res.end();
		notifier
			.notifyClients(lobby.makeCancel())
			.close();
	}
	
	private getQuestionSets(req: Request, res: Response): void {
		verifyRequest(req.body, GetQuestionSetsRequestSchema, `Invalid GetQuestionSetsRequest: ${JSON.stringify(req.body)}`);
		
		const questionSets = this.questionSetManager.getQuestionSets();
		
		const response: GetQuestionSetsResponse = Array.from(questionSets)
			.map(([id, questionSet]) => ({
				id,
				name: questionSet.fileName,
				size: questionSet.questions.length
			}));
		assert(GetQuestionSetsResponseSchema, response);
		res.send(response);
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
							// this.removeLobby(lobby);
							
							// notifier
							// 	.notifyClients(lobby.makeCancel())
							// 	.close();
						} else {
							lobby.removeParticipant(privateId);
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
			.post(KICK_PLAYER_PATH, (req, res) => this.kickPlayer(req, res))
			.post(MOVE_PLAYER_PATH, (req, res) => this.movePlayer(req, res))
			.post(SET_COLOR_PATH, (req, res) => this.setColor(req, res))
			.post(BEGIN_PATH, (req, res) => this.beginGame(req, res))
			.post(CANCEL_PATH, (req, res) => this.cancel(req, res))
			.get(GET_QUESTION_SETS_PATH, (req, res) => this.getQuestionSets(req, res))
			.ws(SUBSCRIBE_PATH, ws => this.subscribe(ws));
	}
}
