import { literal, object, variant, type InferOutput } from "valibot";

import { GameIdSchema, GameStateSchema } from "./game.interface";


// Represents an update to the game state.
export const GameUpdateSchema = object({
	type: literal("update"),
	id: GameIdSchema,
	state: GameStateSchema
});
export type GameUpdate = InferOutput<typeof GameUpdateSchema>;


// Indicates the end of the game. After sending a GameEnd notification, no other
// notifications may be sent for this game.
export const GameEndSchema = object({
	type: literal("end"),
	id: GameIdSchema
});
export type GameEnd = InferOutput<typeof GameEndSchema>;


// A notification about some change to the game.
export const GameNotificationSchema = variant("type", [GameUpdateSchema, GameEndSchema]);
export type GameNotification = InferOutput<typeof GameNotificationSchema>;
