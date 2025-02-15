import { Observable, Subject } from "rxjs"

import { BettingPhase } from "./betting-phase.js";
import { Player, PlayerManager, type PlayerParams } from "./player.js";
import { QuestionPhase } from "./question-phase.js";
import { HttpError } from "../utils/httperror.js";
import { type BetTarget, type GameId, type GameJson } from "../../shared/game/game.js";
import { type PrivateId } from "../../shared/player.js";
import { type GameEnd, type GameUpdate } from "../../shared/game/notifications.js";


export class Game {
	private readonly players: PlayerManager;
	private readonly updates = new Subject<void>();
	private readonly gameEnd = new Subject<void>();
	
	private round: number = 1;
	private question: string;
	private answer: number;
	private phase: QuestionPhase | BettingPhase;
	
	constructor(
			private readonly id: GameId,
			private readonly title: string,
			players: PlayerParams[] | Player[]) {
		this.players = new PlayerManager(players);
		
		const [question, answer] = this.nextQuestion();
		this.question = question;
		this.answer = answer;
		this.phase = new QuestionPhase(question, this.players);
	}
	
	public getId(): GameId {
		return this.id;
	}
	
	public submitGuess(playerId: PrivateId, guess: number): void {
		if (!(this.phase instanceof QuestionPhase)) {
			throw new HttpError(400, "Cannot submit guesses during the betting phase.");
		}
		this.phase.submitGuess(playerId, guess);
		
		this.updates.next();
	}
	
	public submitBet(playerId: PrivateId, target: BetTarget, wager: number): void {
		if (!(this.phase instanceof BettingPhase)) {
			throw new HttpError(400, "Cannot submit bets during the question phase.");
		}
		this.phase.submitBet(playerId, target, wager);
		
		this.updates.next();
	}
	
	public withdrawBet(playerId: PrivateId, target: BetTarget): void {
		if (!(this.phase instanceof BettingPhase)) {
			throw new HttpError(400, "Cannot withdraw bets during the question phase.");
		}
		this.phase.withdrawBet(playerId, target);
		
		this.updates.next();
	}
	
	public endPhase(): void {
		if (this.phase instanceof QuestionPhase) {
			const guesses = this.phase.getGuesses();
			if (guesses.size == 0) {
				// Skip the betting phase if no one submitted guesses.
				this.newRound();
			} else {
				this.startBettingPhase(guesses);
			}
		} else {
			this.phase.resolve();
			this.newRound();
		}
	}
	
	private newRound(): void {
		if (this.round >= 7) {
			this.endGame();
			return;
		}
		
		this.round++;
		const [question, answer] = this.nextQuestion();
		this.question = question;
		this.answer = answer;
		this.phase = new QuestionPhase(this.question, this.players);
		this.updates.next();
	}
	
	private startBettingPhase(guesses: Map<Player, number>): void {
		this.phase = new BettingPhase(this.question, this.answer, this.players, this.round, guesses);
		this.updates.next();
	}
	
	private nextQuestion(): [string, number] {
		return ["Guess a number?", 7];
	}
	
	private endGame(): void {
		this.gameEnd.next();
		this.gameEnd.complete();
		this.updates.complete();
	}
	
	public toJson(forPlayer: PrivateId): GameJson {
		return {
			title: this.title,
			players: this.players.toJson(),
			round: this.round,
			phase: this.phase.toJson(forPlayer)
		};
	}
	
	// This is public because subscribes need to call it for each player.
	public makeUpdate(forPlayer: PrivateId): GameUpdate {
		return {
			type: "update",
			id: this.id,
			state: this.toJson(forPlayer)
		};
	}
	
	public makeGameEnd(): GameEnd {
		return {
			type: "end",
			id: this.id,
			rankings: this.players.rankPlayers()
		}
	}
	
	public getPlayers(): PlayerManager {
		return this.players;
	}
	
	public getRound(): number {
		return this.round;
	}
	
	public getUpdates(): Observable<void> {
		return this.updates.asObservable();
	}
	
	public getGameEnd(): Observable<void> {
		return this.gameEnd.asObservable();
	}
}
