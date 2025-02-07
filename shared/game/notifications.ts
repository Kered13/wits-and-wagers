import { array, literal, number, strictObject, string, variant, type InferOutput } from "valibot";

import { GameIdSchema, GameJsonSchema, GamePlayerJsonSchema } from "./game.js";


// Represents an update to the game state.
export const GameUpdateSchema = strictObject({
	type: literal("update"),
	id: GameIdSchema,
	state: GameJsonSchema
});
export type GameUpdate = InferOutput<typeof GameUpdateSchema>;


// Indicates the end of the game. After sending a GameEnd notification, no other
// notifications may be sent for this game.
export const GameEndSchema = strictObject({
	type: literal("end"),
	id: GameIdSchema,
	rankings: array(GamePlayerJsonSchema)
});
export type GameEnd = InferOutput<typeof GameEndSchema>;


// Indicates an error communicated to the client.
export const GameErrorSchema = strictObject({
	type: literal("error"),
	status: number(),
	message: string()
});
export type GameError = InferOutput<typeof GameErrorSchema>;


// A notification about some change to the game.
export const GameNotificationSchema =
	variant("type", [
		GameUpdateSchema,
		GameEndSchema,
		GameErrorSchema
	]);
export type GameNotification = InferOutput<typeof GameNotificationSchema>;
