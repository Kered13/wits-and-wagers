import { nonEmpty, pipe, strictObject, string, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivatePlayerSchema } from "../player.js";


// Adds a new player to the lobby. This should not be called for the host.
export const JoinLobbyRequestSchema = strictObject({
	// ID of lobby to add the player to.
	lobbyId: LobbyIdSchema,
	// Name of the player.
	name: pipe(string(), nonEmpty())
});
export type JoinLobbyRequest = InferOutput<typeof JoinLobbyRequestSchema>;


export const JoinLobbyResponseSchema = strictObject({
	// Private player information for the new player.
	player: PrivatePlayerSchema
});
export type JoinLobbyResponse = InferOutput<typeof JoinLobbyResponseSchema>;
