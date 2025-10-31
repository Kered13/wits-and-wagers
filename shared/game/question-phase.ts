import { boolean,  integer, literal, number, optional, pipe, record, strictObject, union, type InferOutput } from "valibot";

import { PublicIdSchema } from "../player.js";
import { QuestionInfoSchema } from "./question.js";


// The phase of the game during which a question is presented to the players,
// and each player submits a guess.
export const QuestionPhaseStateSchema = strictObject({
	phase: literal("question"),
	questionInfo: QuestionInfoSchema,
	// For each player in the game, if that player has submitted a guess, holds
	// that guess if this update is for that player, true if this update is for
	// another player. Holds false if that player has not submitted a guess.
	guesses: record(PublicIdSchema, union([boolean(), pipe(number(), integer())])),
	// For a spectator only, their current guess.
	spectatorGuess: optional(number()),
	// Round duration, in milliseconds.
	roundDuration: optional(number()),
	// The time when the round will end, as millisecond timestamp.
	roundEnd: optional(number()),
});
export type QuestionPhaseState = InferOutput<typeof QuestionPhaseStateSchema>;
