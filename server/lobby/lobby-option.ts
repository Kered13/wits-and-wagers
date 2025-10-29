import { DEFAULT_BETTING_PHASE_OPTIONS, type BettingPhaseOptions } from "../game/betting-phase.js";
import { DEFAULT_INTERMISSION_PHASE_OPTIONS, type IntermissionPhaseOptions } from "../game/intermission-phase.js";
import { DEFAULT_QUESTION_PHASE_OPTIONS, type QuestionPhaseOptions } from "../game/question-phase.js";


// See shared/lobby/create.js LobbyOptions for details.
export type LobbyOptions = QuestionPhaseOptions & BettingPhaseOptions & IntermissionPhaseOptions & {
	title: string,
	host: string,
	questionSet: number,
	numberOfPlayers: number,
	numberOfRounds: number,
};


export const DEFAULT_LOBBY_OPTIONS = Object.assign(
	{
		numberOfPlayers: 7,
		numberOfRounds: 7,
	},
	DEFAULT_QUESTION_PHASE_OPTIONS,
	DEFAULT_BETTING_PHASE_OPTIONS,
	DEFAULT_INTERMISSION_PHASE_OPTIONS);
