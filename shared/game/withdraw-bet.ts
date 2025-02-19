import { strictObject, type InferOutput } from "valibot";

import { BetTargetSchema, GameIdSchema } from "./game.js";
import { PrivateIdSchema } from "../player.js";


export const WITHDRAW_BET_PATH = "/withdrawbet";


// During the betting phase, withdraw a bet by the given player on the given
// target.
export const WithdrawBetRequestSchema = strictObject({
	gameId: GameIdSchema,
	requester: PrivateIdSchema,
	target: BetTargetSchema
});
export type WithdrawBetRequest = InferOutput<typeof WithdrawBetRequestSchema>;
