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
import { JOIN_SPECTATOR_PATH, JoinSpectatorRequestSchema, type JoinSpectatorResponse } from "../../shared/game/join-spectator.js";
import { type GameNotification } from "../../shared/game/notifications.js";
import { SUBMIT_BET_PATH, SubmitBetRequestSchema } from "../../shared/game/submit-bet.js";
import { SUBMIT_GUESS_PATH, SubmitGuessRequestSchema } from "../../shared/game/submit-guess.js";
import { WITHDRAW_BET_PATH, WithdrawBetRequestSchema } from "../../shared/game/withdraw-bet.js";
import type { PrivateId } from "../../shared/player.js";


class GameNotifier extends Notifier<GameNotification> {}


type GameData = {
	game: Game,
	notifier: GameNotifier
};


export class GameApp {
	private readonly games: Map<GameId, GameData> = new Map();
	private readonly spectatorGames: Map<GameId, GameData> = new Map();
	
	constructor() {}
	
	private static tryGetGame(games: Map<GameId, GameData>, id: GameId): GameData | undefined {
		return games.get(id);
	}
	
	private static getGame(games: Map<GameId, GameData>, id: GameId): GameData {
		const data = this.tryGetGame(games, id);
		if (!data) {
			throw new HttpError(404, `GameId ${id} not found.`);
		}
		return data;
	}
	
	public tryGetGame(id: GameId): GameData | undefined {
		return GameApp.tryGetGame(this.games, id);
	}
	
	public tryGetSpectatorGame(id: GameId): GameData | undefined {
		return GameApp.tryGetGame(this.spectatorGames, id);
	}
	
	public tryGetAnyGame(id: GameId): GameData | undefined {
		return this.tryGetGame(id) || this.tryGetSpectatorGame(id);
	}
	
	public getAnyGame(id: GameId): GameData {
		const data = this.tryGetAnyGame(id);
		if (!data) {
			throw new HttpError(404, `GameId ${id} not found.`);
		}
		return data;
	}
	
	public addGame(game: Game): void {
		const notifier = new GameNotifier();
		this.games.set(game.getId(), { game, notifier });
		this.spectatorGames.set(game.getSpectatorId(), { game, notifier });
		
		game.onUpdates().subscribe({
			next: () => {
				console.log(`Sending game update.`);
				game.getParticipants().forEach(
					player => notifier.notifyPlayer(player.privateId, game.makeUpdate(player.privateId)));
			},
			complete: () => {
				notifier.close();
				this.games.delete(game.getId());
			}
		});
	}
	
	private joinGame(req: Request, res: Response): void {
		const { gameId, name, privateId } = verifyRequest(
			req.body, JoinSpectatorRequestSchema, `Invalid JoinSpectatorRequest: ${JSON.stringify(req.body)}`);
		
		if (!this.tryJoinPlayer(gameId, privateId, res) &&
				!this.tryJoinSpectator(gameId, name, privateId, res)) {
			throw new HttpError(404, `GameId ${gameId} not found.`);
		}
	}
	
	private tryJoinPlayer(gameId: GameId, privateId: PrivateId | undefined, res: Response): boolean {
		const data = this.tryGetGame(gameId);
		if (!data) {
			return false;
		}
		
		const player = data.game.getPlayers().find(p => p.privateId === privateId);
		if (!player) {
			return false;
		}
		
		res.send({
			player: player.toPrivateJson()
		} satisfies JoinSpectatorResponse);
		res.end();
		return true;
	}
	
	private tryJoinSpectator(gameId: GameId, name: string, privateId: PrivateId | undefined, res: Response): boolean {
		const data = this.tryGetSpectatorGame(gameId);
		if (!data) {
			return false;
		}
		
		const spectator = data.game.addSpectator(name, privateId);
		res.send({
			player: spectator.toPrivateJson()
		} satisfies JoinSpectatorResponse);
		
		console.log(`Sending joinSpectator respond.`);
		res.end();
		return true;
	}
	
	private submitGuess(req: Request, res: Response): void {
		const { gameId, requester, guess } = verifyRequest(
			req.body, SubmitGuessRequestSchema, `Invalid SubmitGuessRequest: ${JSON.stringify(req.body)}`);
		
		const { game } = this.getAnyGame(gameId);
		game.submitGuess(requester, guess);
		
		res.end();
	}
	
	private submitBet(req: Request, res: Response): void {
		const { gameId, requester, target, wager } = verifyRequest(
			req.body, SubmitBetRequestSchema, `Invalid SubmitBetRequest: ${JSON.stringify(req.body)}`);
		
		const { game } = this.getAnyGame(gameId);
		game.submitBet(requester, target, wager);
		
		res.end();
	}
	
	private withdrawBet(req: Request, res: Response): void {
		const { gameId, requester, target } = verifyRequest(
			req.body, WithdrawBetRequestSchema, `Invalid WithdrawBetRequest: ${JSON.stringify(req.body)}`);
		
		const { game } = this.getAnyGame(gameId);
		game.withdrawBet(requester, target);
		
		res.end();
	}
	
	private endPhase(req: Request, res: Response): void {
		const { gameId, requester } = verifyRequest(
			req.body, EndPhaseRequestSchema, `Invalid WithdrawBetRequest: ${JSON.stringify(req.body)}`);
		
		const { game } = this.getAnyGame(gameId);
		game.endPhase(requester);
		
		res.end();
	}
	
	private subscribe(webSocket: WebSocket) {
		const ws = new WebSocketUtil(webSocket);
		ws.onMethod("subscribe", (msg: unknown) => {
			console.log("WS /api/game/subscribe " + JSON.stringify(msg));
			
			try {
				const { privateId, gameId } = verifyRequest(
					msg, SubscribeRequestSchema, `Invalid SubscribeRequest: ${JSON.stringify(msg)}`);
				
				// TODO: Verify that player is in game.
				const { game, notifier } = this.getAnyGame(gameId);
				notifier.addClient(privateId, ws);
				notifier.notifyClient(ws, game.makeUpdate(privateId));
				
				ws.onClose(() => {
					notifier.removeClient(ws);
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
	
	public getRouter() : Router {
		return express.Router()
			.post(JOIN_SPECTATOR_PATH, (req, res) => this.joinGame(req, res))
			.post(SUBMIT_GUESS_PATH, (req, res) => this.submitGuess(req, res))
			.post(SUBMIT_BET_PATH, (req, res) => this.submitBet(req, res))
			.post(WITHDRAW_BET_PATH, (req, res) => this.withdrawBet(req, res))
			.post(END_PHASE_PATH, (req, res) => this.endPhase(req, res))
			.ws(SUBSCRIBE_PATH, ws => this.subscribe(ws));
	}
}
 