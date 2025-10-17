import { integer, number, pipe, strictObject, type InferOutput } from "valibot";

import { BetTargetSchema } from "./betting-phase.js";
import { GameIdSchema } from "./game.js";
import { PrivateIdSchema } from "../player.js";


export const SUBMIT_BET_PATH = "/submitbet";


// During the betting phase, submit a bet for the given player on the given
// target. If the player already has a bet on this target, it will be replaced.
// If the wager is 0, then any existing bet on this target will be removed.
export const SubmitBetRequestSchema = strictObject({
	gameId: GameIdSchema,
	requester: PrivateIdSchema,
	target: BetTargetSchema,
	wager: pipe(number(), integer())
});
export type SubmitBetRequest = InferOutput<typeof SubmitBetRequestSchema>;
