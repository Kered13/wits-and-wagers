import { array, boolean, integer, literal, nonEmpty, number, pipe, record, strictObject, string, union, variant, type InferOutput } from "valibot";

import { PublicIdSchema } from "../player.js";
import { RgbSchema } from "../rgb.js";


export const GAME_API_ROOT = "/api/game";


// ID and join code of the game.
export const GameIdSchema = pipe(string(), nonEmpty());
export type GameId = InferOutput<typeof GameIdSchema>;


// The state of a player during the game. Does not contain per-phase player
// information.
export const GamePlayerSchema = strictObject({
	name: pipe(string(), nonEmpty()),
	publicId: pipe(string(), nonEmpty()),
	color: RgbSchema,
	chips: pipe(number(), integer())
});
export type GamePlayer = InferOutput<typeof GamePlayerSchema>;


// The phase of the game during which a question is presented to the players,
// and each player submits a guess.
export const QuestionPhaseStateSchema = strictObject({
	phase: literal("question"),
	question: pipe(string(), nonEmpty()),
	guesses: record(PublicIdSchema, union([boolean(), pipe(number(), integer())]))
});
export type QuestionPhaseState = InferOutput<typeof QuestionPhaseStateSchema>;


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


export const GameOverPhaseStateSchema = strictObject({
	phase: literal("game-over")
});
export type GameOverPhaseState = InferOutput<typeof GameOverPhaseStateSchema>;


// Represents the state of the game.
export const GameStateSchema = strictObject({
	// The title of the game.
	title: pipe(string(), nonEmpty()),
	// Players in the game, ranked by number of chips.
	players: array(GamePlayerSchema),
	// The current round number.
	round: pipe(number(), integer()),
	// The current phase of the round.
	phase: variant("phase", [QuestionPhaseStateSchema, BettingPhaseStateSchema, GameOverPhaseStateSchema])
});
export type GameState = InferOutput<typeof GameStateSchema>;


export const SkippedBettingPhaseSchema = strictObject({
	type: literal("skipped")
});
export type SkippedBettingPhase = InferOutput<typeof SkippedBettingPhaseSchema>;


export const BettingConclusionSchema = strictObject({
	type: literal("conclusion"),
	winners: array(PublicIdSchema),
	earnings: record(PublicIdSchema, pipe(number(), integer()))
});
export type BettingConclusion = InferOutput<typeof BettingConclusionSchema>;


export const EndRoundSchema = strictObject({
	question: pipe(string(), nonEmpty()),
	answer: pipe(number(), integer()),
	outcome: variant("type", [SkippedBettingPhaseSchema, BettingConclusionSchema])
});
export type EndRound = InferOutput<typeof EndRoundSchema>;
