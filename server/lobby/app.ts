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
import { JOIN_LOBBY_PATH, JoinLobbyRequestSchema, type JoinLobbyRequest, type JoinLobbyResponse, } from "../../shared/lobby/join-lobby.js";
import { KICK_PLAYER_PATH, KickPlayerRequestSchema } from "../../shared/lobby/kick-player.js";
import { type LobbyId } from "../../shared/lobby/lobby.js";
import { MOVE_PLAYER_PATH, MovePlayerRequestSchema } from "../../shared/lobby/move-player.js";
import { type LobbyNotification } from "../../shared/lobby/notifications.js";
import { SUBSCRIBE_PATH, SubscribeRequestSchema } from "../../shared/lobby/subscribe.js";
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
	
	private tryGetLobby(lobbies: Map<LobbyId, LobbyData>, id: LobbyId): LobbyData | undefined {
		return lobbies.get(id);
	}
	
	private getLobby(lobbies: Map<LobbyId, LobbyData>, id: LobbyId): LobbyData {
		const data = this.tryGetLobby(lobbies, id);
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
		this.lobbies.set(lobby.getId(), { lobby: lobby, notifier: new LobbyNotifier });
		this.spectatorLobbies.set(lobby.getSpectatorId(), this.lobbies.get(lobby.getId())!);
		
		const response: CreateLobbyResponse = {
			id: lobby.getId(),
			spectatorId: lobby.getSpectatorId(),
			host: lobby.getHost(),
		};
		assert(CreateLobbyResponseSchema, response);
		res.send(response);
	}
	
	private joinLobby(req: Request, res: Response): void {
		const request = verifyRequest(
			req.body, JoinLobbyRequestSchema, `Invalid JoinLobbyRequest: ${JSON.stringify(req.body)}`);
		
		if (!this.tryJoinLobby(request, res) &&
				!this.tryJoinGame(request, res) &&
				!this.tryJoinSpectatorLobby(request, res) &&
				!this.tryJoinSpectatorGame()) {
			throw new HttpError(404, `LobbyId ${request.lobbyId} not found.`);
		}
	}
	
	private tryJoinLobby(request: JoinLobbyRequest, res: Response): boolean {
		const data = this.tryGetLobby(this.lobbies, request.lobbyId);
		if (!data) {
			return false;
		}
		
		const { lobby, notifier } = data;
		const player = lobby.addPlayer(request.name, request.privateId);
		
		res.send({
			player: player.toPrivateJson()
		} satisfies JoinLobbyResponse);
		
		notifier.notifyClients(lobby.makeUpdate());
		return true;
	}
	
	private tryJoinSpectatorLobby(request: JoinLobbyRequest, res: Response): boolean {
		const data = this.tryGetLobby(this.spectatorLobbies, request.lobbyId);
		if (!data) {
			return false;
		}
		
		const { lobby, notifier } = data;
		const player = lobby.addSpectator(request.name, request.privateId);
		
		res.send({
			player: player.toPrivateJson()
		} satisfies JoinLobbyResponse);
		
		notifier.notifyClients(lobby.makeUpdate());
		return true;
	}
	
	private tryJoinGame(request: JoinLobbyRequest, res: Response): boolean {
		// Check if the lobby has become a game, and if this player is part
		// of that game. Then redirect them to the game.
		const gameData = this.gameApp.tryGetGame(Lobby.gameIdFromLobbyId(request.lobbyId));
		if (!gameData || !request.privateId || !gameData.game.getPlayers().some(player => player.privateId === request.privateId)) {
			return false;
		}
		res.send({
			gameId: gameData.game.getId()
		} satisfies JoinLobbyResponse);
		
		return true;
	}
	
	private tryJoinSpectatorGame(): boolean {
		// TODO
		return false;
	}
	
	private kickPlayer(req: Request, res: Response): void {
		const request = verifyRequest(
			req.body, KickPlayerRequestSchema, `Invalid KickPlayerRequest: ${JSON.stringify(req.body)}`);
		
		const data = this.tryGetLobby(this.lobbies, request.lobbyId) || this.tryGetLobby(this.spectatorLobbies, request.lobbyId);
		if (!data) {
			throw new HttpError(404, `LobbyId ${request.lobbyId} not found.`);
		}
		
		const { lobby, notifier } = data;
		if (!lobby.isHost(request.requester)) {
			throw new HttpError(403, "Only the lobby host may kick a player.");
		}
		
		const player = lobby.getParticipant(request.player);
		lobby.removeParticipant(player.privateId);
		res.end();
		
		notifier
			.notifyPlayer(player.privateId, { type: "kicked", id: lobby.getId() })
			.closeAndRemovePlayer(player.privateId)
			.notifyClients(data.lobby.makeUpdate());
	}
	
	private movePlayer(req: Request, res: Response): void {
		const request = verifyRequest(
			req.body, MovePlayerRequestSchema, `Invalid MovePlayerRequest: ${JSON.stringify(req.body)}`);
			
		const data = this.tryGetLobby(this.lobbies, request.lobbyId) || this.tryGetLobby(this.spectatorLobbies, request.lobbyId);
		if (!data) {
			throw new HttpError(404, `LobbyId ${request.lobbyId} not found.`);
		}
		
		const { lobby, notifier } = data;
		if (!lobby.isHost(request.requester)) {
			throw new HttpError(403, "Only the lobby host may kick a player.");
		}
		
		if (!lobby.hasParticipant(request.player)) {
			throw new HttpError(404, `Player with public ID ${request.player} not found in lobby.`);
		}
		
		if (request.role === "player") {
			// Player is already in the lobby, so we don't need to provide a
			// name.
			lobby.addPlayer("", request.player);
		} else {
			// Player is already in the lobby, so we don't need to provide a name.
			lobby.addSpectator("", request.player);
		}
		
		res.end();
		notifier.notifyClients(data.lobby.makeUpdate());
	}
	
	private beginGame(req: Request, res: Response): void {
		const request = verifyRequest(
			req.body, BeginGameRequestSchema, `Invalid BeginGameRequest: ${JSON.stringify(req.body)}`);
		
		const { lobby, notifier } = this.getLobby(this.lobbies, request.lobbyId);
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
			req.body, CancelLobbyRequestSchema, `Invalid CancelLobbyRequest: ${JSON.stringify(req.body)}`);
		
		const { lobby, notifier } = this.getLobby(this.lobbies, request.lobbyId);
		this.verifyHost(lobby, request.requester);
		
		this.removeLobby(lobby);
		
		res.end();
		notifier
			.notifyClients(lobby.makeCancel())
			.close();
	}
	
	private getQuestionSets(req: Request, res: Response): void {
		const request = verifyRequest(
			req.body, GetQuestionSetsRequestSchema, `Invalid GetQuestionSetsRequest: ${JSON.stringify(req.body)}`);
		
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
				
				const { lobby, notifier } = this.tryGetLobby(this.lobbies, lobbyId) || this.getLobby(this.spectatorLobbies, lobbyId);
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
			.post(BEGIN_PATH, (req, res) => this.beginGame(req, res))
			.post(CANCEL_PATH, (req, res) => this.cancel(req, res))
			.get(GET_QUESTION_SETS_PATH, (req, res) => this.getQuestionSets(req, res))
			.ws(SUBSCRIBE_PATH, ws => this.subscribe(ws));
	}
}
