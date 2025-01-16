import { object, string, type InferOutput } from "valibot";

import { GameIdSchema } from "./game.js";
import { LobbyIdSchema } from "../lobby/lobby.js";


// Create a new game from the given lobby.
export const CreateGameRequestSchema = LobbyIdSchema;
export type CreateGameRequest = InferOutput<typeof CreateGameRequestSchema>;


export const CreateGameResponseSchema = object({
	// ID of the new game. At least for now, this is always the same as the
	// lobby ID.
	id: GameIdSchema
});
export type CreateGameResponse = InferOutput<typeof CreateGameResponseSchema>;
