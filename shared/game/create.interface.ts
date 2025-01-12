import { object, string, type InferOutput } from "valibot";

import { GameIdSchema } from "./game.interface.js";


export const CreateGameRequestSchema = object({
	title: string()
});
export type CreateGameRequest = InferOutput<typeof CreateGameRequestSchema>;


export const CreateGameResponseSchema = object({
	id: GameIdSchema
});
export type CreateGameResponse = InferOutput<typeof CreateGameResponseSchema>;
