import { Lobby } from "./lobby.js";
import { DEFAULT_LOBBY_OPTIONS } from "./lobby-option.js"
import { type GameFactory } from "../game/game-factory.js";
import { type QuestionSetManager } from "../questions/question-set-manager.js";
import { HttpError } from "../utils/httperror.js";
import { type LobbyOptions } from "../../shared/lobby/create.js";
import { type LobbyId } from "../../shared/lobby/lobby.js";


function validateOptions(options: LobbyOptions): void {
	if (options.numberOfPlayers && (options.numberOfPlayers < 1 || options.numberOfPlayers > 7)) {
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
}


export class LobbyFactory {
	constructor(private readonly gameFactory: GameFactory, private readonly questionSetManager: QuestionSetManager) {}
	
	public newLobby(
			id: LobbyId,
			spectatorId: LobbyId,
			options: LobbyOptions): Lobby {
		const lobbyOptions = Object.assign({}, DEFAULT_LOBBY_OPTIONS, options);
		
		const questionSet = this.questionSetManager.getQuestionSet(options.questionSet);
		if (!questionSet) {
			throw new HttpError(400, `Question set ${options.questionSet} does not exist.`);
		} else if (questionSet.questions.length < options.numberOfRounds!) {
			throw new HttpError(400, `Question set ${options.questionSet} does not contain enough questions for ${options.numberOfRounds} rounds.`);
		}
		
		validateOptions(options);
		
		return new Lobby(
			id,
			spectatorId,
			lobbyOptions,
			this.gameFactory)
	}
}
