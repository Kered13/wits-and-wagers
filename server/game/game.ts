import { Observable, Subject } from "rxjs"

import { BettingPhase, bettingPhaseDefaultOptions, type BettingPhaseOptions } from "./betting-phase.js";
import { GameOverPhase } from "./game-over-phase.js";
import { IntermissionPhase, intermissionPhaseDefaultOptions, type IntermissionPhaseOptions } from "./intermission-phase.js";
import { type Phase } from "./phase.js";
import { Player, Spectator, type ParticipantParams, type PlayerParams, type SpectatorParams } from "./player.js";
import { QuestionPhase, questionPhaseDefaultOptions, type QuestionPhaseOptions } from "./question-phase.js";
import { type QuestionGenerator } from "../questions/question-generator.js";
import { HttpError } from "../utils/httperror.js";
import { type BetTarget } from "../../shared/game/betting-phase.js";
import { type GameId, type GameState } from "../../shared/game/game.js";
import { type PrivateId } from "../../shared/player.js";
import { type GameUpdate } from "../../shared/game/notifications.js";
import { type BettingConclusion, type SkippedBettingPhase } from "../../shared/game/intermission-phase.js";
import { PlayerManager } from "./player-manager.js";


export type GameOptions = QuestionPhaseOptions & BettingPhaseOptions & IntermissionPhaseOptions &{
	numberOfRounds: number
};

const defaultOptions: GameOptions = Object.assign(
	{
		numberOfRounds: 7,
	},
	questionPhaseDefaultOptions,
	bettingPhaseDefaultOptions,
	intermissionPhaseDefaultOptions);


export class Game {
	private readonly players: PlayerManager<Player>;
	private readonly spectators: PlayerManager<Spectator>;
	private readonly options: GameOptions;
	private readonly updates = new Subject<void>();
	
	private round: number = 1;
	private question: string;
	private answer: number;
	private phase: Phase;
	
	constructor(
			private readonly id: GameId,
			private readonly title: string,
			private readonly host: ParticipantParams,
			players: PlayerParams[],
			spectators: SpectatorParams[],
			private readonly questionGenerator: QuestionGenerator,
			options?: Partial<GameOptions>) {
		this.players = new PlayerManager(players.map(player => new Player(player)));
		this.spectators = new PlayerManager(spectators.map(player => new Spectator(player)));
		
		const {question, answer} = this.questionGenerator.nextQuestion();
		this.question = question;
		this.answer = answer;
		
		this.options = Object.assign({}, defaultOptions, options);
		
		this.phase = new QuestionPhase(question, this.players, this.options);
		this.startPhase(this.phase);
	}
	
	public getId(): GameId {
		return this.id;
	}
	
	public submitGuess(playerId: PrivateId, guess: number): void {
		if (this.round > this.options.numberOfRounds) {
			throw new HttpError(400, "Game is over, cannot submit guesses.");
		}
		if (!(this.phase instanceof QuestionPhase)) {
			throw new HttpError(400, "Cannot submit guesses during the betting phase.");
		}
		this.phase.submitGuess(playerId, guess);
		
		this.updates.next();
	}
	
	public submitBet(playerId: PrivateId, target: BetTarget, wager: number): void {
		if (this.round > this.options.numberOfRounds) {
			throw new HttpError(400, "Game is over, cannot submit bets.");
		}
		if (!(this.phase instanceof BettingPhase)) {
			throw new HttpError(400, "Cannot submit bets during the question phase.");
		}
		this.phase.submitBet(playerId, target, wager);
		
		this.updates.next();
	}
	
	public withdrawBet(playerId: PrivateId, target: BetTarget): void {
		if (this.isGameOver()) {
			throw new HttpError(400, "Game is over, cannot withdraw bets.");
		}
		if (!(this.phase instanceof BettingPhase)) {
			throw new HttpError(400, "Cannot withdraw bets during the question phase.");
		}
		this.phase.withdrawBet(playerId, target);
		
		this.updates.next();
	}
	
	public endPhase(requester: PrivateId): void {
		if (this.isGameOver()) {
			throw new HttpError(400, "Game is over, cannot end phase.");
		}
		if (requester !== this.host.privateId) {
			throw new HttpError(403, "Only the host can end the phase.");
		}
		this.phase.endPhase();
	}
	
	private startNextPhase(): void {
		if (this.phase instanceof QuestionPhase) {
			const guesses = this.phase.getGuesses();
			if (guesses.size == 0) {
				// Skip the betting phase if no one submitted guesses.
				this.startIntermissionPhase({ type: "skipped" });
			} else {
				this.startBettingPhase(guesses);
			}
		} else if (this.phase instanceof BettingPhase) {
			this.startIntermissionPhase(this.phase.resolve());
		} else if (this.phase instanceof IntermissionPhase) {
			this.startNewRound();
		}
	}
	
	private startNewRound(): void {
		this.round++;
		
		if (this.isGameOver()) {
			this.endGame();
			return;
		}
		
		this.startQuestionPhase();
	}
	
	private startQuestionPhase(): void {
		const {question, answer} = this.questionGenerator.nextQuestion();
		this.question = question;
		this.answer = answer;
		this.startPhase(new QuestionPhase(this.question, this.players, this.options));
	}
	
	private startBettingPhase(guesses: Map<Player, number>): void {
		this.startPhase(
			new BettingPhase(
				this.question,
				this.answer,
				this.players,
				this.spectators,
				this.round,
				guesses,
				this.options))
	}

	private startIntermissionPhase(outcome: SkippedBettingPhase | BettingConclusion): void {
		this.startPhase(
			new IntermissionPhase(
				this.question,
				this.answer,
				outcome,
				this.options));
	}
	
	private startPhase(phase: Phase): void {
		this.phase = phase;
		phase.onEndPhase().subscribe(() => this.startNextPhase());
		this.updates.next();
	}
	
	private endGame(): void {
		this.phase = new GameOverPhase();
		this.updates.next();
		this.updates.complete();
	}
	
	private isGameOver(): boolean {
		return this.round > this.options.numberOfRounds;
	}
	
	public toJson(forPlayer: PrivateId): GameState {
		return {
			title: this.title,
			host: this.host.publicId,
			players: this.players.sortedByChips().map(player => player.toJson()),
			spectators: this.spectators.sortedByChips().map(spectator => spectator.toJson()),
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
	
	public getPlayers(): Player[] {
		return this.players.getAll();
	}
	
	public getSpectators(): Spectator[] {
		return this.spectators.getAll();
	}
	
	public getParticipants(): (Player | Spectator)[] {
		return [...this.getPlayers(), ...this.getSpectators()];
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
}
