import { strictObject, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivateIdSchema } from "../player.js";


// Subscribes to a WebSocket notification stream for the given lobby and player.
export const SubscribeRequestSchema = strictObject({
	// ID of lobby to add the player to.
	lobbyId: LobbyIdSchema,
	// PrivateId of the player that is subscribing.
	privateId: PrivateIdSchema,
});
export type SubscribeRequest = InferOutput<typeof SubscribeRequestSchema>;
