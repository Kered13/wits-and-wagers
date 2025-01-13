import { object, string, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.interface.js";


export const CreateLobbyRequestSchema = object({
	title: string()
});
export type CreateLobbyRequest = InferOutput<typeof CreateLobbyRequestSchema>;


export const CreateLobbyResponseSchema = object({
	id: LobbyIdSchema
});
export type CreateLobbyResponse = InferOutput<typeof CreateLobbyResponseSchema>;
