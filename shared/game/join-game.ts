import { nonEmpty, optional, pipe, strictObject, string, type InferOutput } from "valibot";

import { GameIdSchema } from "./game.js";
import { PrivateIdSchema, PrivatePlayerSchema } from "../player.js";


export const JOIN_SPECTATOR_PATH = "/joinspectator";


// Adds a new spectator to the game, or rejoin for an existing player or
// spectator.
export const JoinGameRequestSchema = strictObject({
	// ID of game to add the spectator to.
	gameId: GameIdSchema,
	// Name of the spectator.
	name: pipe(string(), nonEmpty()),
	// Optional PrivateId of the player/spectator. This can be used to rejoin a
	// game. If the player is already in the game, no new player will be added
	// and the same PrivateId will be returned. If privateId is not provided or
	// the player is not already in the game, then a new spectator will be added
	// and a new PrivateId will be returned that is valid in this game.
	privateId: optional(PrivateIdSchema)
});
export type JoinGameRequest = InferOutput<typeof JoinGameRequestSchema>;


export const JoinGameResponseSchema = strictObject({
	// Private player information for the player/spectator.
	player: PrivatePlayerSchema,
});
export type JoinGameResponse = InferOutput<typeof JoinGameResponseSchema>;
