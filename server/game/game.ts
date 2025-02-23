import { Observable, Subject } from "rxjs"

import { BettingPhase, type BettingPhaseOptions } from "./betting-phase.js";
import { EndPhase } from "./end-phase.js";
import { type Phase } from "./phase.js";
import { Player, PlayerManager, type PlayerParams } from "./player.js";
import { QuestionPhase, type QuestionPhaseOptions } from "./question-phase.js";
import { HttpError } from "../utils/httperror.js";
import { type BetTarget, type BettingConclusion, type GameId, type GameJson, type SkippedBettingPhase } from "../../shared/game/game.js";
import { type PrivateId } from "../../shared/player.js";
import { type EndRoundNotification, type GameUpdate } from "../../shared/game/notifications.js";


export type GameOptions = QuestionPhaseOptions & BettingPhaseOptions;

const defaultOptions: GameOptions = {
	endQuestionPhaseWhenAllGuessesSubmitted: true
};


export class Game {
	private readonly players: PlayerManager;
	private readonly options: GameOptions;
	private readonly updates = new Subject<void>();
	private readonly roundEnd = new Subject<EndRoundNotification>();
	
	// round = 8 if the game is over.
	private round: number = 1;
	private question: string;
	private answer: number;
	private phase: Phase;
	
	constructor(
			private readonly id: GameId,
			private readonly title: string,
			players: PlayerParams[] | Player[],
			options?: GameOptions) {
		this.players = new PlayerManager(players);
		
		const [question, answer] = this.nextQuestion();
		this.question = question;
		this.answer = answer;
		
		this.options = Object.assign(defaultOptions, options);
		
		this.phase = new QuestionPhase(question, this.players, this.options);
		this.startPhase(this.phase);
	}
	
	public getId(): GameId {
		return this.id;
	}
	
	public submitGuess(playerId: PrivateId, guess: number): void {
		if (this.round > 7) {
			throw new HttpError(400, "Game is over, cannot submit guesses.");
		}
		if (!(this.phase instanceof QuestionPhase)) {
			throw new HttpError(400, "Cannot submit guesses during the betting phase.");
		}
		this.phase.submitGuess(playerId, guess);
		
		this.updates.next();
	}
	
	public submitBet(playerId: PrivateId, target: BetTarget, wager: number): void {
		if (this.round > 7) {
			throw new HttpError(400, "Game is over, cannot submit bets.");
		}
		if (!(this.phase instanceof BettingPhase)) {
			throw new HttpError(400, "Cannot submit bets during the question phase.");
		}
		this.phase.submitBet(playerId, target, wager);
		
		this.updates.next();
	}
	
	public withdrawBet(playerId: PrivateId, target: BetTarget): void {
		if (this.round > 7) {
			throw new HttpError(400, "Game is over, cannot withdraw bets.");
		}
		if (!(this.phase instanceof BettingPhase)) {
			throw new HttpError(400, "Cannot withdraw bets during the question phase.");
		}
		this.phase.withdrawBet(playerId, target);
		
		this.updates.next();
	}
	
	public endPhase(requester: PrivateId): void {
		if (this.round > 7) {
			throw new HttpError(400, "Game is over, cannot end phase.");
		}
		this.phase.endPhase();
	}
	
	private startNextPhase(): void {
		if (this.phase instanceof QuestionPhase) {
			const guesses = this.phase.getGuesses();
			if (guesses.size == 0) {
				// Skip the betting phase if no one submitted guesses.
				this.startNewRound({ type: "skipped" });
			} else {
				this.startBettingPhase(guesses);
			}
		} else if (this.phase instanceof BettingPhase) {
			this.startNewRound(this.phase.resolve());
		}
	}
	
	private startNewRound(outcome: SkippedBettingPhase | BettingConclusion): void {
		this.roundEnd.next(this.makeEndRound(outcome));
		this.round++;
		
		if (this.round > 7) {
			this.endGame();
			return;
		}
		
		this.startQuestionPhase();
	}
	
	private startQuestionPhase(): void {
		const [question, answer] = this.nextQuestion();
		this.question = question;
		this.answer = answer;
		this.startPhase(new QuestionPhase(this.question, this.players, this.options));
	}
	
	private startBettingPhase(guesses: Map<Player, number>): void {
		this.startPhase(new BettingPhase(this.question, this.answer, this.players, this.round, guesses, this.options))
	}
	
	private startPhase(phase: Phase): void {
		this.phase = phase;
		phase.onEndPhase().subscribe(() => this.startNextPhase());
		this.updates.next();
	}
	
	private nextQuestion(): [string, number] {
		return ["Guess a number?", 7];
	}
	
	private endGame(): void {
		this.phase = new EndPhase();
		this.round = 8;
		this.updates.next();
		this.updates.complete();
		this.roundEnd.complete();
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
	
	private makeEndRound(outcome: SkippedBettingPhase | BettingConclusion): EndRoundNotification {
		return {
			type: "end-round",
			id: this.id,
			endRound: {
				question: this.question,
				answer: this.answer,
				outcome: outcome
			}
		};
	}
	
	public getPlayers(): PlayerManager {
		return this.players;
	}
	
	public getRound(): number {
		return this.round;
	}
	
	// Notifies when a new update is available. Subscribers should call
	// makeUpdate() to get the update. When this observable completes, the game
	// is over.
	public onUpdates(): Observable<void> {
		return this.updates.asObservable();
	}
	
	// Notifies when a round ends. Subscribers should call makeRoundEnd() to get
	// information on how the round ended. This observable completes when the
	// game is over.
	public onRoundEnd(): Observable<EndRoundNotification> {
		return this.roundEnd.asObservable();
	}
}
