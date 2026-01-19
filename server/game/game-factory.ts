import { Game } from "./game.js";
import { type GameOptions } from "./game-options.js";
import { type ParticipantParams, type PlayerParams, type SpectatorParams } from "../player/player.js";
import { QuestionGenerator } from "../questions/question-generator.js";
import { type QuestionSetManager } from "../questions/question-set-manager.js";
import { HttpError } from "../utils/httperror.js";
import { type LobbyOptions } from "../lobby/lobby-option.js";
import { type GameId } from "../../shared/game/game.js";
import { type QuestionAnswerInfo } from "../../shared/game/question.js";


export class GameFactory {
	constructor(private readonly questionSetManager: QuestionSetManager) {}
	
	public newGame(
			id: GameId,
			spectatorId: GameId,
			players: PlayerParams[],
			spectators: SpectatorParams[],
			host: ParticipantParams,
			questionSetIds: number[],
			options: LobbyOptions): Game {
		const gameOptions: GameOptions = Object.assign({}, options, { host: host});
		
		const questions = questionSetIds.flatMap(id => this.questionSetManager.getQuestionSet(id).questions);
		const questionGenerator = new QuestionGenerator(questions, gameOptions.numberOfRounds);
		
		return new Game(id, spectatorId, players, spectators, gameOptions, questionGenerator);
	}
}
