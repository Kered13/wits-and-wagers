import { boolean,  integer, literal, number, optional, pipe, record, strictObject, union, type InferOutput } from "valibot";

import { PublicIdSchema } from "../player.js";
import { QuestionInfoSchema } from "./question.js";


// The phase of the game during which a question is presented to the players,
// and each player submits a guess.
export const QuestionPhaseStateSchema = strictObject({
	phase: literal("question"),
	questionInfo: QuestionInfoSchema,
	guesses: record(PublicIdSchema, union([boolean(), pipe(number(), integer())])),
	// Round duration, in milliseconds.
	roundDuration: optional(number()),
	// The time when the round will end, as millisecond timestamp.
	roundEnd: optional(number()),
});
export type QuestionPhaseState = InferOutput<typeof QuestionPhaseStateSchema>;
