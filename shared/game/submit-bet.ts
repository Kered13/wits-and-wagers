import { integer, number, pipe, strictObject, type InferOutput } from "valibot";

import { BetTargetSchema, GameIdSchema } from "./game.js";
import { PrivateIdSchema } from "../player.js";


// During the betting phase, submit a bet for the given player on the given
// target.
export const SubmitBetRequestSchema = strictObject({
	gameId: GameIdSchema,
	requester: PrivateIdSchema,
	target: BetTargetSchema,
	wager: pipe(number(), integer())
});
export type SubmitBetRequest = InferOutput<typeof SubmitBetRequestSchema>;
