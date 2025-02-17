import { integer, number, pipe, strictObject, type InferOutput } from "valibot";

import { GameIdSchema } from "./game.js";
import { PrivateIdSchema } from "../player.js";


// During the question phase, submit a guess for the given player.
export const SubmitGuessRequestSchema = strictObject({
	gameId: GameIdSchema,
	requester: PrivateIdSchema,
	guess: pipe(number(), integer())
});
export type SubmitGuessRequest = InferOutput<typeof SubmitGuessRequestSchema>;
