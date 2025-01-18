import { nonEmpty, pipe, strictObject, string, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivatePlayerSchema } from "../player.js";


// Adds a new player to the lobby. This should not be called for the host.
export const AddPlayerRequestSchema = strictObject({
	// ID of lobby to add the player to.
	lobbyId: LobbyIdSchema,
	// Name of the player.
	name: pipe(string(), nonEmpty())
});
export type AddPlayerRequest = InferOutput<typeof AddPlayerRequestSchema>;


export const AddPlayerResponseSchema = strictObject({
	// Private player information for the new player.
	player: PrivatePlayerSchema
});
export type AddPlayerResponse = InferOutput<typeof AddPlayerResponseSchema>;
