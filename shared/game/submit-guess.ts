import { integer, minValue, number, optional, pipe, strictObject, type InferOutput } from "valibot";

import { GameIdSchema } from "./game.js";
import { PrivateIdSchema } from "../player.js";


export const SUBMIT_GUESS_PATH = "/submitguess";


// During the question phase, submit a guess for the given player.
export const SubmitGuessRequestSchema = strictObject({
	gameId: GameIdSchema,
	requester: PrivateIdSchema,
	// If not provided, withdraw guess instead of submit.
	guess: optional(pipe(number(), integer(), minValue(1))),
});
export type SubmitGuessRequest = InferOutput<typeof SubmitGuessRequestSchema>;
