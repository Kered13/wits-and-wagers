import { literal, strictObject, variant, type InferOutput } from "valibot";

import { GameIdSchema, GameStateSchema } from "./game.js";
import { WsErrorSchema } from "../ws-error.js";


// Represents an update to the game state.
export const GameUpdateSchema = strictObject({
	type: literal("update"),
	state: GameStateSchema
});
export type GameUpdate = InferOutput<typeof GameUpdateSchema>;


// A notification about some change to the game.
export const GameNotificationSchema =
	variant("type", [
		GameUpdateSchema,
		WsErrorSchema
	]);
export type GameNotification = InferOutput<typeof GameNotificationSchema>;
