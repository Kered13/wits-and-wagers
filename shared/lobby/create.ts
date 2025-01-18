import { nonEmpty, pipe, strictObject, string, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivatePlayerSchema } from "../player.js";


// Creates a new lobby and adds the host to it.
export const CreateLobbyRequestSchema = strictObject({
	// Name of the lobby and subsequent game.
	title: pipe(string(), nonEmpty()),
	// Name of the host player.
	host: pipe(string(), nonEmpty())
});
export type CreateLobbyRequest = InferOutput<typeof CreateLobbyRequestSchema>;


export const CreateLobbyResponseSchema = strictObject({
	// ID of the lobby and subsequent game.
	id: LobbyIdSchema,
	// Private player information for the host.
	host: PrivatePlayerSchema
});
export type CreateLobbyResponse = InferOutput<typeof CreateLobbyResponseSchema>;
