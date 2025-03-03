import { array, integer, literal, nonEmpty, number, pipe, record, strictObject, string, variant, type InferOutput } from "valibot";

import { BettingPhaseStateSchema } from "./betting-phase.js";
import { QuestionPhaseStateSchema } from "./question-phase.js";
import { PublicIdSchema } from "../player.js";
import { RgbSchema } from "../rgb.js";


export const GAME_API_ROOT = "/api/game";


// ID and join code of the game.
export const GameIdSchema = pipe(string(), nonEmpty());
export type GameId = InferOutput<typeof GameIdSchema>;


// The state of a spectator during the game. Spectators can place bets but
// cannot submit guesses.
export const GameSpectatorSchema = strictObject({
	name: pipe(string(), nonEmpty()),
	publicId: pipe(string(), nonEmpty()),
	chips: pipe(number(), integer())
});
export type GameSpectator = InferOutput<typeof GameSpectatorSchema>;


// The state of a player during the game. Does not contain per-phase player
// information.
export const GamePlayerSchema = strictObject({
	...GameSpectatorSchema.entries,
	color: RgbSchema
});
export type GamePlayer = InferOutput<typeof GamePlayerSchema>;


export const GameOverPhaseStateSchema = strictObject({
	phase: literal("game-over")
});
export type GameOverPhaseState = InferOutput<typeof GameOverPhaseStateSchema>;


// Represents the state of the game.
export const GameStateSchema = strictObject({
	// The title of the game.
	title: pipe(string(), nonEmpty()),
	// The host of the game.
	host: PublicIdSchema,
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
