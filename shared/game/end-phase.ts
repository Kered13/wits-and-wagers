import { strictObject, type InferOutput } from "valibot";

import { GameIdSchema } from "./game.js";
import { PrivateIdSchema } from "../player.js";


// End the current game phase.
export const EndPhaseRequestSchema = strictObject({
	gameId: GameIdSchema,
	requester: PrivateIdSchema
});
export type EndPhaseRequest = InferOutput<typeof EndPhaseRequestSchema>;
