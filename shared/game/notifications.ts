import { literal, strictObject, variant, type InferOutput } from "valibot";

import { EndRoundSchema, GameIdSchema, GameJsonSchema } from "./game.js";
import { WsErrorSchema } from "../ws-error.js";


// Represents an update to the game state.
export const GameUpdateSchema = strictObject({
	type: literal("update"),
	id: GameIdSchema,
	state: GameJsonSchema
});
export type GameUpdate = InferOutput<typeof GameUpdateSchema>;


export const EndRoundNotificationSchema = strictObject({
	type: literal("end-round"),
	id: GameIdSchema,
	endRound: EndRoundSchema
});
export type EndRoundNotification = InferOutput<typeof EndRoundNotificationSchema>;


// A notification about some change to the game.
export const GameNotificationSchema =
	variant("type", [
		GameUpdateSchema,
		EndRoundNotificationSchema,
		WsErrorSchema
	]);
export type GameNotification = InferOutput<typeof GameNotificationSchema>;
