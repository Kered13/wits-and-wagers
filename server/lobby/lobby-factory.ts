import random from "random";
import { parse } from "valibot";

import { Lobby } from "./lobby.js";
import { DEFAULT_LOBBY_OPTIONS } from "./lobby-option.js"
import { type GameFactory } from "../game/game-factory.js";
import { type QuestionSetManager } from "../questions/question-set-manager.js";
import { HttpError } from "../utils/httperror.js";
import { type LobbyOptions } from "../../shared/lobby/create.js";
import { LobbyIdSchema, type LobbyId } from "../../shared/lobby/lobby.js";


export class LobbyFactory {
	private static lobbyCounter: number = 0;
	
	constructor(private readonly gameFactory: GameFactory, private readonly questionSetManager: QuestionSetManager) {}
	
	public newLobby(options: LobbyOptions): Lobby {
		const lobbyOptions = Object.assign({}, DEFAULT_LOBBY_OPTIONS, options);
		
		this.validateOptions(options);
		
		return new Lobby(
			LobbyFactory.createLobbyId(),
			LobbyFactory.createLobbySpectatorId(),
			lobbyOptions,
			this.gameFactory)
	}
	
	private static createLobbyId(): LobbyId {
		// Spread removes empty slots from the array.
		return parse(LobbyIdSchema, [...Array(5)].map(() => this.randomLetter()).join(""));
	}
	
	private static createLobbySpectatorId(): LobbyId {
		// Spread removes empty slots from the array.
		return parse(LobbyIdSchema, [...Array(5)].map(() => this.randomLetter()).join(""));
	}
	
	private static randomLetter(): string {
		return random.choice([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"])!;
	}
	
	private validateOptions(options: LobbyOptions): void {
		if (options.maxPlayers && (options.maxPlayers < 1 || options.maxPlayers > 7)) {
			throw new HttpError(400, "Number of players must be between 1 and 7.");
		}
		if (options.numberOfRounds && (options.numberOfRounds < 1)) {
			throw new HttpError(400, "Number of rounds must be greater than 0.");
		}
		if (options.questionPhaseDuration && (options.questionPhaseDuration <= 0)) {
			throw new HttpError(400, "Question phase duration must be greater than 0.");
		}
		if (options.bettingPhaseDuration && (options.bettingPhaseDuration <= 0)) {
			throw new HttpError(400, "Question phase duration must be greater than 0.");
		}
		
		const numQuestions = options.questionSets
			.map(id => this.questionSetManager.getQuestionSet(id))
			.reduce((size, questionSet) => size + questionSet.questions.length, 0);
		if (numQuestions < options.numberOfRounds!) {
			throw new HttpError(400, `Question sets [${options.questionSets.join(", ")}] do not contain enough questions for ${options.numberOfRounds} rounds.`);
		}
	}
}
