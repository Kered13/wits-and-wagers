import express, { Router, type Request, type Response } from "express";
import { type WebSocket } from "ws";

import { Game } from "./game.js";
import { HttpError } from "../utils/httperror.js";
import { Notifier } from "../utils/notifier.js";
import { verifyRequest } from "../utils/verifyrequest.js";
import { WebSocketUtil } from "../utils/websocket.js";
import { SUBSCRIBE_PATH, SubscribeRequestSchema } from "../../shared/game/subscribe.js";
import { END_PHASE_PATH, EndPhaseRequestSchema } from "../../shared/game/end-phase.js";
import { type GameId } from "../../shared/game/game.js";
import { JOIN_SPECTATOR_PATH, JoinGameRequestSchema, type JoinGameResponse } from "../../shared/game/join-game.js";
import { type GameNotification } from "../../shared/game/notifications.js";
import { SUBMIT_BET_PATH, SubmitBetRequestSchema } from "../../shared/game/submit-bet.js";
import { SUBMIT_GUESS_PATH, SubmitGuessRequestSchema } from "../../shared/game/submit-guess.js";
import { type PrivateId } from "../../shared/player.js";
import { type Subscription } from "rxjs";


const GAME_GARBAGE_COLLECTION_TIMEOUT_MS = 30*60*1000;


class GameNotifier extends Notifier<GameNotification> {}


type GameData = {
	game: Game,
	notifier: GameNotifier
};


export class GameApp {
	private readonly games: Map<GameId, GameData> = new Map();
	
	constructor() {}
	
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
		this.games.set(game.getSpectatorId(), { game, notifier });
		
		let sub: Subscription;
		let timeout = setTimeout(() => this.deleteGame(game, notifier, sub), GAME_GARBAGE_COLLECTION_TIMEOUT_MS);
		sub = game.onUpdates().subscribe({
			next: () => {
				timeout.refresh();
				game.getParticipants().forEach(
					player => notifier.notifyPlayer(player.privateId, game.makeUpdate(player.privateId)));
			},
			complete: () => {
				clearTimeout(timeout);
				this.deleteGame(game, notifier, sub);
			}
		});
	}
	
	private deleteGame(game: Game, notifier: GameNotifier, sub: Subscription): void {
		console.log(`Deleting game ${game.getId()}`);
		sub.unsubscribe();
		notifier.close();
		this.games.delete(game.getId());
		this.games.delete(game.getSpectatorId());
	}
	
	private joinGame(req: Request, res: Response): void {
		const { gameId, name, privateId } = verifyRequest(
			req.body, JoinGameRequestSchema, `Invalid JoinGameRequest: ${JSON.stringify(req.body)}`);
		
		const game = this.tryGetGame(gameId)?.game;
		if (!game) {
			throw new HttpError(404, `GameId ${gameId} not found.`);
		}
		
		res.send(this.tryJoinPlayer(game, privateId) ??
			this.joinSpectator(game, name, privateId));
	}
	
	private tryJoinPlayer(game: Game, privateId: PrivateId | undefined): JoinGameResponse | undefined {
		if (!privateId) {
			return undefined;
		}
		const player = game.getPlayer(privateId);
		if (!player) {
			return undefined;
		}
		
		return {
			player: player.toPrivateJson()
		};
	}
	
	private joinSpectator(game: Game, name: string, privateId: PrivateId | undefined): JoinGameResponse {
		return {
			player: game.addSpectator(name, privateId).toPrivateJson()
		};
	}
	
	private submitGuess(req: Request, res: Response): void {
		const { gameId, requester, guess } = verifyRequest(
			req.body, SubmitGuessRequestSchema, `Invalid SubmitGuessRequest: ${JSON.stringify(req.body)}`);
		
		const { game } = this.getGame(gameId);
		game.submitGuess(requester, guess);
		res.end();
	}
	
	private submitBet(req: Request, res: Response): void {
		const { gameId, requester, target, wager } = verifyRequest(
			req.body, SubmitBetRequestSchema, `Invalid SubmitBetRequest: ${JSON.stringify(req.body)}`);
		
		const { game } = this.getGame(gameId);
		game.submitBet(requester, target, wager);
		res.end();
	}
	
	private endPhase(req: Request, res: Response): void {
		const { gameId, requester } = verifyRequest(
			req.body, EndPhaseRequestSchema, `Invalid endPhaseRequest: ${JSON.stringify(req.body)}`);
		
		const { game } = this.getGame(gameId);
		game.endPhase(requester);
		res.end();
	}
	
	private subscribe(webSocket: WebSocket, req: Request) {
		const ws = new WebSocketUtil(webSocket, req.ip ?? "unknown");
		ws.onMethod("subscribe", (msg: unknown) => {
			console.log("WS /api/game/subscribe " + JSON.stringify(msg));
			
			try {
				const { privateId, gameId } = verifyRequest(
					msg, SubscribeRequestSchema, `Invalid SubscribeRequest: ${JSON.stringify(msg)}`);
				
				const { game, notifier } = this.getGame(gameId);
				
				if (!game.hasParticipant(privateId)) {
					throw new HttpError(403, `Player ${privateId} is not a participant in game ${gameId}.`);
				}
				
				notifier.addClient(privateId, ws);
				notifier.notifyClient(ws, game.makeUpdate(privateId));
				
				ws.onClose(() => {
					console.log(`WebSocket closed for game ${gameId}, player ${privateId}`);
					notifier.removeClient(ws);
				});
			} catch (err) {
				if (err instanceof HttpError) {
					console.error(err.message);
					ws.error(err.status, err.message);
					ws.close();
				} else if (err instanceof Error) {
					console.error(`Error: ${err}`);
				} else {
					console.error(`Unknown error: ${err} | ${JSON.stringify(err)}`);
				}
			}
		});
	}
	
	public getRouter() : Router {
		return express.Router()
			.post(JOIN_SPECTATOR_PATH, (req, res) => this.joinGame(req, res))
			.post(SUBMIT_GUESS_PATH, (req, res) => this.submitGuess(req, res))
			.post(SUBMIT_BET_PATH, (req, res) => this.submitBet(req, res))
			.post(END_PHASE_PATH, (req, res) => this.endPhase(req, res))
			.ws(SUBSCRIBE_PATH, (ws, req) => this.subscribe(ws, req));
	}
	
	// TODO: Remove when disconnect testing is no longer needed.
	public terminateWebsockets(): void {
		console.log("Terminating all game websockets...");
		this.games.forEach(({ notifier }) => notifier.terminate());
	}
}
