import { pipe, strictObject, title, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivateIdSchema } from "../player.js";


export const SUBSCRIBE_PATH = "/subscribe";


// Subscribes to a WebSocket notification stream for the given lobby and player.
export const SubscribeRequestSchema = pipe(
	strictObject({
		// ID of lobby to add the player to.
		lobbyId: LobbyIdSchema,
		// PrivateId of the player that is subscribing.
		privateId: PrivateIdSchema,
	}),
	title("SubscribeRequest"));
export type SubscribeRequest = InferOutput<typeof SubscribeRequestSchema>;
