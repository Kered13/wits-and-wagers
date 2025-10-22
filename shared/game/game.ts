import { array, integer, literal, nonEmpty, number,  pipe, strictObject, string, variant, type InferOutput } from "valibot";

import { BettingPhaseStateSchema } from "./betting-phase.js";
import { IntermissionPhaseStateSchema } from "./intermission-phase.js";
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
	// Spectators in the game, ranked by number of chips.
	spectators: array(GameSpectatorSchema),
	// The current round number.
	round: pipe(number(), integer()),
	// The current phase of the round.
	phase: variant("phase", [QuestionPhaseStateSchema, BettingPhaseStateSchema, IntermissionPhaseStateSchema, GameOverPhaseStateSchema])
});
export type GameState = InferOutput<typeof GameStateSchema>;
