import express, { Router, type Request, type Response } from "express";
import { is } from "valibot";
import type { WebSocket } from "ws";

import { Game } from "./game.js";
import type { LobbyApp } from "../lobby/app.js";
import { HttpError } from "../utils/httperror.js";
import { Notifier } from "../utils/notifier.js";
import { WebSocketUtil } from "../utils/websocket.js";
import { type CreateGameResponse } from "../../shared/game/create.js";
import { AddOneRequestSchema, GameIdSchema, ResetRequestSchema, type AddOneRequest, type GameId, type GameJson } from "../../shared/game/game.js";
import { LobbyIdSchema } from "../../shared/lobby/lobby.js";


class GameNotifier extends Notifier<GameJson, Game, GameId> {}

export class GameApp {
	private readonly games: Map<GameId, GameNotifier> = new Map();
	
	constructor(private readonly lobbyApp: LobbyApp) {}
	
	private create(req: Request, res: Response): void {
		console.log("POST /api/game/create " + JSON.stringify(req.body));
		if (!is(LobbyIdSchema, req.body)) {
			throw new HttpError(400, `${req.body} is not a valid LobbyId.`);
		}
		
		const lobby = this.lobbyApp.getLobby(req.body);
		if (!lobby) {
			throw new HttpError(404, `LobbyId ${req.body} not found.`);
		}
		
		const gameNotifier = new GameNotifier(lobby.id, lobby.state.createGame());
		this.games.set(gameNotifier.id, gameNotifier);
		this.lobbyApp.lobbies.delete(lobby.id);
		
		const response: CreateGameResponse = { id: gameNotifier.id };
		res.send(response);
	}
	
	private addOne(req: Request, res: Response): void {
		console.log("POST /api/game/addone " + JSON.stringify(req.body));
		
		if (!is(AddOneRequestSchema, req.body)) {
			throw new HttpError(400, `${req.body} is not a valid GameId.`);
		}
	
		const request: AddOneRequest = req.body;
		const gameNotifier = this.games.get(request.gameId);
		if (!gameNotifier) {
			throw new HttpError(404, `GameId ${request.gameId} not found.`);
		}
	
		gameNotifier.state.addOne(request.privateId);
		res.end();
		gameNotifier.notifyClients();
	}
	
	private reset(req: Request, res: Response): void {
		console.log("POST /api/game/reset " + JSON.stringify(req.body));
		if (!is(ResetRequestSchema, req.body)) {
			throw new HttpError(400, `${req.body} is not a valid GameId.`);
		}
		
		const request: AddOneRequest = req.body;
		const gameNotifier = this.games.get(request.gameId);
		if (!gameNotifier) {
			throw new HttpError(404, `GameId ${request.gameId} not found.`);
		}
		
		gameNotifier.state.resetCounter(request.privateId);
		res.end();
		gameNotifier.notifyClients();
	}
	
	private wsState(webSocket: WebSocket) {
		const ws = new WebSocketUtil(webSocket);
		ws.onMethod("register", (msg: unknown) => {
			console.log("WS /api/game/state " + JSON.stringify(msg));
			
			if (!is(GameIdSchema, msg)) {
				throw new HttpError(400, `${msg} is not a valid GameId.`);
			}
			
			const gameId: GameId = msg;
			const game = this.games.get(gameId);
			if (!game) {
				throw new HttpError(404, `GameId ${gameId} not found.`);
			}
			ws.onClose(() => {
				game.removeClient(ws);
			});
			game.notifyClient(ws);
			game.addClient(ws);
		});
	}
	
	public getRouter() : Router {
		return express.Router()
			.post("/create", (req, res) => this.create(req, res))
			.post("/addone", (req, res) => this.addOne(req, res))
			.post("/reset", (req, res) => this.reset(req, res))
			.ws("/state", ws => this.wsState(ws));
	}
}
