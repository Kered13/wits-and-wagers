import express, { Router, type Request, type Response } from "express";
import { type WebSocket } from "ws";

import { Game } from "./game.js";
import { HttpError } from "../utils/httperror.js";
import { Notifier } from "../utils/notifier.js";
import { verifyRequest } from "../utils/verifyrequest.js";
import { WebSocketUtil } from "../utils/websocket.js";
import { type GameId } from "../../shared/game/game.js";
import { type GameError, type GameNotification } from "../../shared/game/notifications.js";
import { SubscribeRequestSchema } from "../../shared/game/subscribe.js";
import { SubmitGuessRequestSchema } from "../../shared/game/submit-guess.js";
import { SubmitBetRequestSchema } from "../../shared/game/submit-bet.js";
import { WithdrawBetRequestSchema } from "../../shared/game/withdraw-bet.js";


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
		const notifier = new GameNotifier();
		this.games.set(game.getId(), { game, notifier });
		
		game.getUpdates().subscribe(() => {
			for (const player of game.getPlayers().getAll()) {
				notifier.notifyPlayer(player.privateId, game.makeUpdate(player.privateId));
			}
		});
		
		game.getGameEnd().subscribe(() => {
			notifier.notifyClients(game.makeGameEnd());
		});
	}
	
	private submitGuess(req: Request, res: Response): void {
		console.log("POST /api/game/submitguess " + JSON.stringify(req.body));
		
		const { gameId, requester, guess } = verifyRequest(
			req.body, SubmitGuessRequestSchema, `Invalid SubmitGuessRequest: ${req.body}`);
		
		const { notifier, game } = this.getGame(gameId);
		game.submitGuess(requester, guess);
		
		res.end();
	}
	
	private submitBet(req: Request, res: Response): void {
		console.log("POST /api/game/submitbet " + JSON.stringify(req.body));
		
		const { gameId, requester, target, wager } = verifyRequest(
			req.body, SubmitBetRequestSchema, `Invalid SubmitBetRequest: ${req.body}`);
		
		const { notifier, game } = this.getGame(gameId);
		game.submitBet(requester, target, wager);
		
		res.end();
	}
	
	private withdrawBet(req: Request, res: Response): void {
		console.log("POST /api/game/withdrawbet " + JSON.stringify(req.body));
		
		const { gameId, requester, target } = verifyRequest(
			req.body, WithdrawBetRequestSchema, `Invalid WithdrawBetRequest: ${req.body}`);
		
		const { notifier, game } = this.getGame(gameId);
		game.withdrawBet(requester, target);
		
		res.end();
	}
	
	private wsState(webSocket: WebSocket) {
		const ws = new WebSocketUtil(webSocket);
		ws.onMethod("subscribe", (msg: unknown) => {
			console.log("WS /api/game/state " + JSON.stringify(msg));
			
			try {
				const { privateId, gameId } = verifyRequest(
					msg, SubscribeRequestSchema, `Invalid SubscribeRequest: ${msg}`);
				
				const { game, notifier } = this.getGame(gameId);
				notifier.addClient(privateId, ws);
				notifier.notifyClient(ws, game.makeUpdate(privateId));
				
				ws.onClose(() => {
					notifier.removeClient(privateId, ws);
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
			.post("/submitguess", (req, res) => this.submitGuess(req, res))
			.post("/submitbet", (req, res) => this.submitBet(req, res))
			.post("/withdrawbet", (req, res) => this.withdrawBet(req, res))
			.ws("/state", ws => this.wsState(ws));
	}
}
