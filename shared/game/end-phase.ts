import { pipe, strictObject, title, type InferOutput } from "valibot";

import { GameIdSchema } from "./game.js";
import { PrivateIdSchema } from "../player.js";


export const END_PHASE_PATH = "/endphase";


// End the current game phase.
export const EndPhaseRequestSchema = pipe(
	strictObject({
		gameId: GameIdSchema,
		requester: PrivateIdSchema
	}),
	title("EndPhaseRequest"));
export type EndPhaseRequest = InferOutput<typeof EndPhaseRequestSchema>;
