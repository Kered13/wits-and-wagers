import { array, boolean, integer, literal, nonEmpty, number, pipe, record, strictObject, string, union, variant, type InferOutput } from "valibot";

import { PublicIdSchema } from "../player.js";
import { RgbSchema } from "../rgb.js";


export const GAME_API_ROOT = "/api/game";


// ID and join code of the game.
export const GameIdSchema = pipe(string(), nonEmpty());
export type GameId = InferOutput<typeof GameIdSchema>;


// The state of a player during the game. Does not contain per-phase player
// information.
export const GamePlayerJsonSchema = strictObject({
	name: pipe(string(), nonEmpty()),
	publicId: pipe(string(), nonEmpty()),
	color: RgbSchema,
	chips: pipe(number(), integer())
});
export type GamePlayerJson = InferOutput<typeof GamePlayerJsonSchema>;


// The phase of the game during which a question is presented to the players,
// and each player submits a guess.
export const QuestionPhaseJsonSchema = strictObject({
	phase: literal("question"),
	question: pipe(string(), nonEmpty()),
	guesses: record(PublicIdSchema, union([boolean(), pipe(number(), integer())]))
});
export type QuestionPhaseJson = InferOutput<typeof QuestionPhaseJsonSchema>;


// Guesses that were submitted during the QuestionPhase.
export const GuessJsonSchema = strictObject({
	player: PublicIdSchema,
	guess: pipe(number(), integer()),
});
export type GuessJson = InferOutput<typeof GuessJsonSchema>;


// Possible bets that can be placed.
export const BetTargetSchema = union([
	literal("AllTooHigh"),
	literal("Red"),
	literal("Black"),
	pipe(number(), integer())
]);
export type BetTarget = InferOutput<typeof BetTargetSchema>;


// A single bet placed during the BettingPhase.
export const BetJsonSchema = strictObject({
	player: PublicIdSchema,
	target: BetTargetSchema,
	wager: pipe(number(), integer())
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


export const EndPhaseJsonSchema = strictObject({
	phase: literal("end")
});
export type EndPhaseJson = InferOutput<typeof EndPhaseJsonSchema>;


// Represents the state of the game.
export const GameJsonSchema = strictObject({
	// The title of the game.
	title: pipe(string(), nonEmpty()),
	// Players in the game, ranked by number of chips.
	players: array(GamePlayerJsonSchema),
	// The current round number.
	round: pipe(number(), integer()),
	// The current phase of the round.
	phase: variant("phase", [QuestionPhaseJsonSchema, BettingPhaseJsonSchema, EndPhaseJsonSchema])
});
export type GameJson = InferOutput<typeof GameJsonSchema>;
