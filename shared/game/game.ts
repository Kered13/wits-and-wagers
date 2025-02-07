import { array, boolean, literal, nonEmpty, number, pipe, record, strictObject, string, union, variant, type InferOutput } from "valibot";

import { PublicIdSchema } from "../player.js";
import { RgbSchema } from "../rgb.js";


// ID and join code of the game.
export const GameIdSchema = pipe(string(), nonEmpty());
export type GameId = InferOutput<typeof GameIdSchema>;


// The state of a player during the game. Does not contain per-phase player
// information.
export const GamePlayerJsonSchema = strictObject({
	name: pipe(string(), nonEmpty()),
	publicId: pipe(string(), nonEmpty()),
	color: RgbSchema,
	chips: number()
});
export type GamePlayerJson = InferOutput<typeof GamePlayerJsonSchema>;


// The phase of the game during which a question is presented to the players,
// and each player submits a guess.
export const QuestionPhaseJsonSchema = strictObject({
	phase: literal("question"),
	question: pipe(string(), nonEmpty()),
	guesses: record(PublicIdSchema, union([boolean(), number()]))
});
export type QuestionPhaseJson = InferOutput<typeof QuestionPhaseJsonSchema>;


// Guesses that were submitted during the QuestionPhase.
export const GuessJsonSchema = strictObject({
	player: PublicIdSchema,
	guess: number(),
});
export type GuessJson = InferOutput<typeof GuessJsonSchema>;


// Possible bets that can be placed.
export const BetTargetSchema = union([
	literal("AllTooHigh"),
	literal("Red"),
	literal("Black"),
	number()
]);
export type BetTarget = InferOutput<typeof BetTargetSchema>;


// A single bet placed during the BettingPhase.
export const BetJsonSchema = strictObject({
	player: PublicIdSchema,
	target: BetTargetSchema,
	wager: number()
});
export type BetJson = InferOutput<typeof BetJsonSchema>;


// The phase of the game during which players place bets on the guesses that
// were submitted during the QuestionPhase.
export const BettingPhaseJsonSchema = strictObject({
	phase: literal("betting"),
	question: pipe(string(), nonEmpty()),
	guesses: array(GuessJsonSchema),
	bets: array(BetJsonSchema)
});
export type BettingPhaseJson = InferOutput<typeof BettingPhaseJsonSchema>;


// Represents the state of the game.
export const GameJsonSchema = strictObject({
	// The title of the game.
	title: pipe(string(), nonEmpty()),
	// Players in the game.
	players: array(GamePlayerJsonSchema),
	// The current round number.
	round: number(),
	// The current phase of the round.
	phase: variant("phase", [QuestionPhaseJsonSchema, BettingPhaseJsonSchema])
});
export type GameJson = InferOutput<typeof GameJsonSchema>;
