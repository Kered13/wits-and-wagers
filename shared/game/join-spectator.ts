import { nonEmpty, optional, pipe, strictObject, string, type InferOutput } from "valibot";

import { PrivateIdSchema, PrivatePlayerSchema } from "../player.js";
import { GameIdSchema } from "../game/game.js";


export const JOIN_SPECTATOR_PATH = "/joinspectator";


// Adds a new player to the lobby. This should not be called for the host.
export const JoinSpectatorRequestSchema = strictObject({
	// ID of game to add the spectator to.
	gameId: GameIdSchema,
	// Name of the spectator.
	name: pipe(string(), nonEmpty()),
	// Optional PrivateId of the spectator. This can be used to rejoin a game.
	// If the spectator is already in the game, no new player will be added and
	// the same PrivateId will be returned. If privateId is not provided or the
	// spectator is not already in the game, then the spectator will be added
	// and a new PrivateId will be returned that is valid in this lobby.
	privateId: optional(PrivateIdSchema)
});
export type JoinSpectatorRequest = InferOutput<typeof JoinSpectatorRequestSchema>;


export const JoinSpectatorResponseSchema = strictObject({
	// Private player information for the new spectator.
	player: PrivatePlayerSchema,
});
export type JoinSpectatorResponse = InferOutput<typeof JoinSpectatorResponseSchema>;
