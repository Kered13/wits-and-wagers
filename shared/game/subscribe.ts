import { pipe, strictObject, title, type InferOutput } from "valibot";

import { GameIdSchema } from "./game.js";
import { PrivateIdSchema } from "../player.js";


export const SUBSCRIBE_PATH = "/subscribe";


// Subscribes to a WebSocket notification stream for the given game and player.
export const SubscribeRequestSchema = pipe(
	strictObject({
		// ID of game to add the player to.
		gameId: GameIdSchema,
		// PrivateId of the player that is subscribing.
		privateId: PrivateIdSchema,
	}),
	title("SubscribeRequestSchema"));
export type SubscribeRequest = InferOutput<typeof SubscribeRequestSchema>;
