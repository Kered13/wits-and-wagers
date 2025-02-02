import { strictObject, type InferOutput } from "valibot";

import { GameIdSchema } from "./game.js";
import { PrivateIdSchema } from "../player.js";


// Subscribes to a WebSocket notification stream for the given game and player.
export const SubscribeRequestSchema = strictObject({
	// ID of game to add the player to.
	gameId: GameIdSchema,
	// PrivateId of the player that is subscribing.
	privateId: PrivateIdSchema,
});
export type SubscribeRequest = InferOutput<typeof SubscribeRequestSchema>;
