import { array, integer, literal,  number, pipe, record, strictObject, variant, type InferOutput } from "valibot";

import { PublicIdSchema } from "../player.js";
import { QuestionAnswerInfoSchema } from "./question.js";



export const SkippedBettingPhaseSchema = strictObject({
	type: literal("skipped")
});
export type SkippedBettingPhase = InferOutput<typeof SkippedBettingPhaseSchema>;


export const BettingConclusionSchema = strictObject({
	type: literal("conclusion"),
	winners: array(PublicIdSchema),
	earnings: record(PublicIdSchema, pipe(number(), integer())),
	spectatorEarnings: record(PublicIdSchema, pipe(number(), integer())),
});
export type BettingConclusion = InferOutput<typeof BettingConclusionSchema>;


// The phase of the game during which a question is presented to the players,
// and each player submits a guess.
export const IntermissionPhaseStateSchema = strictObject({
	phase: literal("intermission"),
	questionInfo: QuestionAnswerInfoSchema,
	outcome: variant("type", [SkippedBettingPhaseSchema, BettingConclusionSchema])
});
export type IntermissionPhaseState = InferOutput<typeof IntermissionPhaseStateSchema>;
