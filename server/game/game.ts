import { Observable, Subject } from "rxjs"

import { BettingPhase } from "./betting-phase.js";
import { Player } from "./player.js";
import { QuestionPhase } from "./question-phase.js";
import { type LobbyPlayer } from "../lobby/lobby.js";
import { HttpError } from "../utils/httperror.js";
import { type BetTarget, type GameId, type GameJson } from "../../shared/game/game.js";
import { type PrivateId } from "../../shared/player.js";
import { type GameEnd, type GameUpdate } from "../../shared/game/notifications.js";


export class Game {
	private readonly players: Player[];
	private readonly updates = new Subject<void>();
	private readonly gameEnd = new Subject<void>();
	
	private round: number = 1;
	private question: string;
	private answer: number;
	private phase: QuestionPhase | BettingPhase;
	
	constructor(
			private readonly id: GameId,
			private readonly title: string,
			lobbyPlayers: LobbyPlayer[]) {
		this.players = lobbyPlayers.map(player => new Player(player));
		
		const [question, answer] = this.nextQuestion();
		this.question = question;
		this.answer = answer;
		this.phase = new QuestionPhase(question, this);
	}
	
	public getId(): GameId {
		return this.id;
	}
	
	public hasPlayer(id: PrivateId): boolean {
		return !!this.tryGetPlayer(id);
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
			throw new HttpError(400, "Cannot submit bets during the betting phase.");
		}
		this.phase.submitBet(playerId, target, wager);
		
		this.updates.next();
	}
	
	public withdrawBet(playerId: PrivateId, target: BetTarget): void {
		if (!(this.phase instanceof BettingPhase)) {
			throw new HttpError(400, "Cannot withdraw bets during the betting phase.");
		}
		this.phase.withdrawBet(playerId, target);
		
		this.updates.next();
	}
	
	public endPhase(): void {
		if (this.phase instanceof QuestionPhase) {
			const guesses = this.phase.getGuesses();
			if (!guesses.size) {
				this.newRound();
			} else {
				this.phase = new BettingPhase(this.question, this.answer, this, guesses);
			}
		} else {
			if (this.round < 7) {
				this.phase.resolve();
				this.newRound();
			} else {
				this.endGame();
				return;
			}
		}
		this.updates.next();
	}
	
	private newRound(): void {
		this.round++;
		const [question, answer] = this.nextQuestion();
		this.question = question;
		this.answer = answer;
		this.phase = new QuestionPhase(this.question, this);
	}
	
	private nextQuestion(): [string, number] {
		return ["Guess a number?", 7];
	}
	
	private endGame(): void {
		this.gameEnd.next();
	}
	
	public toJson(forPlayer: PrivateId): GameJson {
		return {
			title: this.title,
			players: this.players.map(player => player.toJson()),
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
	
	private makeGameEnd(): GameEnd {
		return {
			type: "end",
			id: this.id,
			rankings: this.players
				.sort((first, second) => second.chips - first.chips)
				.map(player => player.toJson())
		}
	}
	
	public getPlayers(): Player[] {
		return this.players;
	}
	
	public getPlayer(id: PrivateId): Player {
		const player = this.tryGetPlayer(id);
		if (!player) {
			throw new HttpError(404, `Player private ID ${id} not found.`);
		}
		return player;
	}
	
	public tryGetPlayer(id: PrivateId): Player | undefined {
		return this.players.find(player => player.privateId === id);
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
