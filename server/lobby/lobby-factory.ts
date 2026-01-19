import { Lobby } from "./lobby.js";
import { DEFAULT_LOBBY_OPTIONS } from "./lobby-option.js"
import { type GameFactory } from "../game/game-factory.js";
import { type QuestionSetManager } from "../questions/question-set-manager.js";
import { HttpError } from "../utils/httperror.js";
import { type LobbyOptions } from "../../shared/lobby/create.js";
import { type LobbyId } from "../../shared/lobby/lobby.js";


export class LobbyFactory {
	constructor(private readonly gameFactory: GameFactory, private readonly questionSetManager: QuestionSetManager) {}
	
	public newLobby(
			id: LobbyId,
			spectatorId: LobbyId,
			options: LobbyOptions): Lobby {
		const lobbyOptions = Object.assign({}, DEFAULT_LOBBY_OPTIONS, options);
		
		this.validateOptions(options);
		
		return new Lobby(
			id,
			spectatorId,
			lobbyOptions,
			this.gameFactory)
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
