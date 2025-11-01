import { Observable, Subject } from "rxjs"

import { BettingPhase } from "./betting-phase.js";
import { type GameOptions } from "./game-options.js";
import { GameOverPhase } from "./game-over-phase.js";
import { IntermissionPhase } from "./intermission-phase.js";
import { type Phase } from "./phase.js";
import { Player, Spectator, type ParticipantParams, type PlayerParams, type SpectatorParams } from "../player/player.js";
import { PlayerManager } from "../player/player-manager.js";
import { QuestionPhase, } from "./question-phase.js";
import { QuestionGenerator } from "../questions/question-generator.js";
import { HttpError } from "../utils/httperror.js";
import { type BetTarget } from "../../shared/game/betting-phase.js";
import { type GameId, type GameState } from "../../shared/game/game.js";
import { type PrivateId } from "../../shared/player.js";
import { type GameUpdate } from "../../shared/game/notifications.js";
import { type BettingConclusion, type SkippedBettingPhase } from "../../shared/game/intermission-phase.js";
import { type QuestionAnswerInfo } from "../../shared/game/question.js";


export class Game {
	private readonly playerManager: PlayerManager;
	private readonly updates = new Subject<void>();
	private readonly host: ParticipantParams;
	
	private round: number = 1;
	private question!: QuestionAnswerInfo;
	private phase!: Phase;
	
	constructor(
			private readonly id: GameId,
			players: PlayerParams[],
			spectators: SpectatorParams[],
			private readonly options: GameOptions,
			private readonly questionGenerator: QuestionGenerator) {
		this.host = this.options.host;
		this.playerManager = new PlayerManager(
			players.map(player => new Player(player)),
			spectators.map(player => new Spectator(player)));
		
		this.startQuestionPhase();
	}
	
	public getId(): GameId {
		return this.id;
	}
	
	public addSpectator(name: string, id?: PrivateId): Spectator {
		const existingSpectator = this.playerManager.tryGetPrivateSpectator(id ?? "" as PrivateId);
		if (existingSpectator) {
			return existingSpectator;
		}
		
		const spectator: Spectator = Spectator.generate(name);
		this.playerManager.addSpectator(spectator);
		this.updates.next();
		return spectator;
	}
	
	public submitGuess(playerId: PrivateId, guess?: number): void {
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
			const [guesses, specGuesses] = this.phase.getGuesses();
			if (guesses.size == 0) {
				// Skip the betting phase if no one submitted guesses.
				this.startIntermissionPhase({ type: "skipped" });
			} else {
				this.startBettingPhase(guesses, specGuesses);
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
		this.question = this.questionGenerator.nextQuestion();
		this.startPhase(new QuestionPhase(this.question, this.playerManager, this.options));
	}
	
	private startBettingPhase(guesses: Map<Player, number>, specGuesses: Map<Spectator, number>): void {
		this.startPhase(
			new BettingPhase(
				this.question,
				this.playerManager,
				guesses,
				specGuesses,
				this.round,
				this.options))
	}

	private startIntermissionPhase(outcome: SkippedBettingPhase | BettingConclusion): void {
		this.startPhase(
			new IntermissionPhase(
				this.question,
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
			title: this.options.title,
			host: this.host.publicId,
			players: this.playerManager.getAllPlayers().map(player => player.toGameJson()),
			spectators: this.playerManager.getAllSpectators().map(spectator => spectator.toGameJson()),
			round: this.round,
			phase: this.phase.toJson(forPlayer)
		};
	}
	
	// This is public because subscribes need to call it for each player.
	public makeUpdate(forPlayer: PrivateId): GameUpdate {
		return {
			type: "update",
			state: this.toJson(forPlayer)
		};
	}
	
	public getParticipants(): (Player | Spectator)[] {
		return [...this.playerManager.getAllPlayers(), ...this.playerManager.getAllSpectators()];
	}
	
	public getPlayer(player: PrivateId): Player | undefined {
		return this.playerManager.tryGetPrivatePlayer(player);
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
