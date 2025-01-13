import { literal, object, variant, type InferOutput } from "valibot";

import { LobbyIdSchema, LobbyStateSchema } from "./lobby.interface.js";


// Represents an update to the lobby state.
export const LobbyUpdateSchema = object({
	type: literal("update"),
	id: LobbyIdSchema,
	state: LobbyStateSchema
});
export type LobbyUpdate = InferOutput<typeof LobbyUpdateSchema>;


// A notification about some change to the lobby.
export const LobbyNotificationSchema = variant("type", [LobbyUpdateSchema]);
export type LobbyNotification = InferOutput<typeof LobbyNotificationSchema>;
