import express, { Router, type Request, type Response } from "express";
import { type WebSocket } from "ws";

import { Game } from "./game.js";
import { HttpError } from "../utils/httperror.js";
import { Notifier } from "../utils/notifier.js";
import { verifyRequest } from "../utils/verifyrequest.js";
import { WebSocketUtil } from "../utils/websocket.js";
import { AddOneRequestSchema, GameIdSchema, ResetRequestSchema, type GameId } from "../../shared/game/game.js";
import { type GameError, type GameNotification } from "../../shared/game/notifications.js";


class GameNotifier extends Notifier<GameNotification> {}


type GameData = {
	game: Game,
	notifier: GameNotifier
};


export class GameApp {
	private readonly games: Map<GameId, GameData> = new Map();
	
	public tryGetGame(id: GameId): GameData | undefined {
		return this.games.get(id);
	}
	
	public getGame(id: GameId): GameData {
		const data = this.tryGetGame(id);
		if (!data) {
			throw new HttpError(404, `GameId ${id} not found.`);
		}
		return data;
	}
	
	public addGame(game: Game): void {
		this.games.set(game.getId(), { game: game, notifier: new GameNotifier() });
	}
	
	private addOne(req: Request, res: Response): void {
		console.log("POST /api/game/addone " + JSON.stringify(req.body));
		
		const request = verifyRequest(
			req.body, AddOneRequestSchema, `Invalid AddOneRequest: ${req.body}`);
		
		const { game, notifier } = this.getGame(request.gameId);
		game.addOne(req.body.privateId);
		
		res.end();
		notifier.notifyClients(game.makeUpdate());
	}
	
	private reset(req: Request, res: Response): void {
		console.log("POST /api/game/reset " + JSON.stringify(req.body));
		
		const request = verifyRequest(
			req.body, ResetRequestSchema, `Invalid ResetRequest: ${req.body}`);
		
		const { game, notifier } = this.getGame(request.gameId);
		game.resetCounter(request.privateId);
		
		res.end();
		notifier.notifyClients(game.makeUpdate());
	}
	
	private wsState(webSocket: WebSocket) {
		const ws = new WebSocketUtil(webSocket);
		ws.onMethod("subscribe", (msg: unknown) => {
			console.log("WS /api/game/state " + JSON.stringify(msg));
			
			try {
				const gameId = verifyRequest(
					msg, GameIdSchema, `${msg} is not a valid GameId.`);
				
				const { game, notifier } = this.getGame(gameId);
				notifier.addClient(ws);
				notifier.notifyClient(ws, game.makeUpdate());
				
				ws.onClose(() => {
					notifier.removeClient(ws);
				});
			} catch (err) {
				if (err instanceof HttpError) {
					console.error(err.message);
					ws.send<GameError>({
						type: "error",
						status: err.status,
						message: err.message
					});
					ws.close();
				}
			}
		});
	}
	
	public getRouter() : Router {
		return express.Router()
			.post("/addone", (req, res) => this.addOne(req, res))
			.post("/reset", (req, res) => this.reset(req, res))
			.ws("/state", ws => this.wsState(ws));
	}
}
