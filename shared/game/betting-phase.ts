import { array, integer, literal, nonEmpty, number, pipe, strictObject, string, union, type InferOutput } from "valibot";

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
	pipe(number(), integer())
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
	bets: array(BetSchema)
});
export type BettingPhaseState = InferOutput<typeof BettingPhaseStateSchema>;
