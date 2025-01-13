import { object, string, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.interface.js";


export const AddPlayerRequestSchema = object({
	lobbyId: LobbyIdSchema,
	name: string()
});
export type AddPlayerRequest = InferOutput<typeof AddPlayerRequestSchema>;
