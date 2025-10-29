import { type BettingPhaseOptions } from "./betting-phase.js";
import { type IntermissionPhaseOptions } from "./intermission-phase.js";
import { type QuestionPhaseOptions } from "./question-phase.js";
import { type ParticipantParams } from "../player/player.js";


export type GameOptions = QuestionPhaseOptions & BettingPhaseOptions & IntermissionPhaseOptions & {
	title: string,
	host: ParticipantParams,
	questionSet: number,
	numberOfRounds: number,
};
