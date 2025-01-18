import { literal, strictObject, variant, type InferOutput } from "valibot";

import { LobbyIdSchema, LobbyJsonSchema } from "./lobby.js";


// Represents an update to the lobby state.
export const LobbyUpdateSchema = strictObject({
	type: literal("update"),
	id: LobbyIdSchema,
	state: LobbyJsonSchema
});
export type LobbyUpdate = InferOutput<typeof LobbyUpdateSchema>;


// A notification about some change to the lobby.
export const LobbyNotificationSchema = variant("type", [LobbyUpdateSchema]);
export type LobbyNotification = InferOutput<typeof LobbyNotificationSchema>;
