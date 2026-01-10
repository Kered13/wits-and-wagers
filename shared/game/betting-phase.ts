import { array, integer, literal, minValue, number, optional, pipe, strictObject, union, type InferOutput } from "valibot";

import { PublicIdSchema } from "../player.js";
import { QuestionInfoSchema } from "./question.js";


const GuessTargetSchema = union([literal(0),
	literal(1),
	literal(2),
	literal(3),
	literal(4),
	literal(5),
	literal(6),
]);
export type GuessTarget = InferOutput<typeof GuessTargetSchema>;


// Possible bets that can be placed.
export const BetTargetSchema = union([
	literal("AllTooHigh"),
	literal("Red"),
	literal("Black"),
	GuessTargetSchema,
]);
export type BetTarget = InferOutput<typeof BetTargetSchema>;


// Guesses that were submitted during the QuestionPhase.
export const GuessSchema = strictObject({
	player: PublicIdSchema,
	target: BetTargetSchema,
	guess: pipe(number(), integer()),
});
export type Guess = InferOutput<typeof GuessSchema>;


// A single bet placed during the BettingPhase.
export const BetSchema = strictObject({
	player: PublicIdSchema,
	target: BetTargetSchema,
	wager: pipe(number(), integer(), minValue(0)),
});
export type Bet = InferOutput<typeof BetSchema>;


// The phase of the game during which players place bets on the guesses that
// were submitted during the QuestionPhase.
export const BettingPhaseStateSchema = strictObject({
	phase: literal("betting"),
	questionInfo: QuestionInfoSchema,
	guesses: array(GuessSchema),
	spectatorGuess: optional(number()),
	// Bets placed by players.
	bets: array(BetSchema),
	// Bets placed by a spectator. Only reported to that spectator.
	spectatorBets: array(BetSchema),
	// Round duration, in milliseconds.
	roundDuration: optional(number()),
	// The time when the round will end, as millisecond timestamp.
	roundEnd: optional(number()),
});
export type BettingPhaseState = InferOutput<typeof BettingPhaseStateSchema>;
