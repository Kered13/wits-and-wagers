import express, { Router, type Request, type Response } from "express";
import { is } from "valibot";
import type { WebSocket } from "ws";

import { Game } from "./game.js";
import { HttpError } from "../utils/httperror.js";
import { Notifier } from "../utils/notifier.js";
import { WebSocketUtil } from "../utils/websocket.js";
import { AddOneRequestSchema, GameIdSchema, ResetRequestSchema, type GameId } from "../../shared/game/game.js";
import type { GameNotification } from "../../shared/game/update.js";


class GameNotifier extends Notifier<GameNotification> {}


type GameData = {
	game: Game,
	notifier: GameNotifier
};


export class GameApp {
	private readonly games: Map<GameId, GameData> = new Map();
	
	private getGame(id: GameId): GameData {
		const data = this.games.get(id);
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
		
		if (!is(AddOneRequestSchema, req.body)) {
			throw new HttpError(400, `${req.body} is not a valid GameId.`);
		}
		
		const { game, notifier } = this.getGame(req.body.gameId);
		game.addOne(req.body.privateId);
		
		res.end();
		notifier.notifyClients(game.makeUpdate());
	}
	
	private reset(req: Request, res: Response): void {
		console.log("POST /api/game/reset " + JSON.stringify(req.body));
		if (!is(ResetRequestSchema, req.body)) {
			throw new HttpError(400, `${req.body} is not a valid GameId.`);
		}
		
		const { game, notifier } = this.getGame(req.body.gameId);
		game.resetCounter(req.body.privateId);
		
		res.end();
		notifier.notifyClients(game.makeUpdate());
	}
	
	private wsState(webSocket: WebSocket) {
		const ws = new WebSocketUtil(webSocket);
		ws.onMethod("register", (msg: unknown) => {
			console.log("WS /api/game/state " + JSON.stringify(msg));
			
			if (!is(GameIdSchema, msg)) {
				throw new HttpError(400, `${msg} is not a valid GameId.`);
			}
			
			const gameId: GameId = msg;
			const { game, notifier } = this.getGame(gameId);
			notifier.addClient(ws);
			notifier.notifyClient(ws, game.makeUpdate());
			
			ws.onClose(() => {
				notifier.removeClient(ws);
			});
		});
	}
	
	public getRouter() : Router {
		return express.Router()
			.post("/addone", (req, res) => this.addOne(req, res))
			.post("/reset", (req, res) => this.reset(req, res))
			.ws("/state", ws => this.wsState(ws));
	}
}
