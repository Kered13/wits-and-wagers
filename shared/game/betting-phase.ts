import { array, integer, literal, nonEmpty, number, optional, pipe, strictObject, string, union, type InferOutput } from "valibot";

import { PublicIdSchema } from "../player.js";


// Guesses that were submitted during the QuestionPhase.
export const GuessSchema = strictObject({
	player: PublicIdSchema,
	guess: pipe(number(), integer()),
});
export type Guess = InferOutput<typeof GuessSchema>;


// Possible bets that can be placed.
export const BetTargetSchema = union([
	literal("AllTooHigh"),
	literal("Red"),
	literal("Black"),
	literal(0),
	literal(1),
	literal(2),
	literal(3),
	literal(4),
	literal(5),
	literal(6),
]);
export type BetTarget = InferOutput<typeof BetTargetSchema>;


// A single bet placed during the BettingPhase.
export const BetSchema = strictObject({
	player: PublicIdSchema,
	target: BetTargetSchema,
	wager: pipe(number(), integer())
});
export type Bet = InferOutput<typeof BetSchema>;


// The phase of the game during which players place bets on the guesses that
// were submitted during the QuestionPhase.
export const BettingPhaseStateSchema = strictObject({
	phase: literal("betting"),
	question: pipe(string(), nonEmpty()),
	guesses: array(GuessSchema),
	bets: array(BetSchema),
	// Round duration, in milliseconds.
	roundDuration: optional(number()),
	// The time when the round will end, as millisecond timestamp.
	roundEnd: optional(number())
});
export type BettingPhaseState = InferOutput<typeof BettingPhaseStateSchema>;
