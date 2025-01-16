import { nonEmpty, object, pipe, string, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.interface.js";


export const AddPlayerRequestSchema = object({
	lobbyId: LobbyIdSchema,
	name: pipe(string(), nonEmpty())
});
export type AddPlayerRequest = InferOutput<typeof AddPlayerRequestSchema>;
