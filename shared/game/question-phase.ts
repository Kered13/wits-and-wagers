import { boolean, date, integer, literal, nonEmpty, number, optional, pipe, record, strictObject, string, union, type InferOutput } from "valibot";

import { PublicIdSchema } from "../player.js";


// The phase of the game during which a question is presented to the players,
// and each player submits a guess.
export const QuestionPhaseStateSchema = strictObject({
	phase: literal("question"),
	question: pipe(string(), nonEmpty()),
	guesses: record(PublicIdSchema, union([boolean(), pipe(number(), integer())])),
	roundDuration: optional(number()),
	// The time when the round will end, as millisecond timestamp.
	roundEnd: optional(number())
});
export type QuestionPhaseState = InferOutput<typeof QuestionPhaseStateSchema>;
