import { Game } from "./game.js";
import { type ParticipantParams, type PlayerParams, type SpectatorParams } from "../player/player.js";
import { QuestionGenerator } from "../questions/question-generator.js";
import { type QuestionSetManager } from "../questions/question-set-manager.js";
import { HttpError } from "../utils/httperror.js";
import { type GameId } from "../../shared/game/game.js";
import { type LobbyOptions } from "../lobby/lobby-option.js";
import { type GameOptions } from "./game-options.js";


export class GameFactory {
	constructor(private readonly questionSetManager: QuestionSetManager) {}
	
	public newGame(
			id: GameId,
			spectatorId: GameId,
			players: PlayerParams[],
			spectators: SpectatorParams[],
			host: ParticipantParams,
			questionSetId: number,
			options: LobbyOptions): Game {
		const gameOptions: GameOptions = Object.assign({}, options, { host: host});
		
		const questionSet = this.questionSetManager.getQuestionSet(questionSetId);
		if (!questionSet) {
			throw new HttpError(500, `Invalid question set: ${questionSetId}`);
		}
		const questionGenerator = new QuestionGenerator(questionSet.questions, gameOptions.numberOfRounds);
		
		return new Game(id, spectatorId, players, spectators, gameOptions, questionGenerator);
	}
}
