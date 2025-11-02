import { integer, literal, minValue, number, pipe, strictObject, union, type InferOutput } from "valibot";

import { GameIdSchema } from "./game.js";
import { PrivateIdSchema } from "../player.js";


export const SUBMIT_GUESS_PATH = "/submitguess";


export const WITHDRAW = "withdraw";
export const GuessOrWithdrawSchema = union([literal(WITHDRAW), pipe(number(), integer(), minValue(1))]);
export type GuessOrWithdraw = InferOutput<typeof GuessOrWithdrawSchema>;


// During the question phase, submit a guess for the given player.
export const SubmitGuessRequestSchema = strictObject({
	gameId: GameIdSchema,
	requester: PrivateIdSchema,
	// If not provided, withdraw guess instead of submit.
	guess: GuessOrWithdrawSchema,
});
export type SubmitGuessRequest = InferOutput<typeof SubmitGuessRequestSchema>;
