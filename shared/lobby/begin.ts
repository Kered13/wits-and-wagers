import { pipe, strictObject, title, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivateIdSchema } from "../player.js";


export const BEGIN_PATH = "/begin";


// Create a new game from the given lobby. Can only be called by the Host of the lobby.
export const BeginGameRequestSchema = pipe(
	strictObject({
		lobbyId: LobbyIdSchema,
		requester: PrivateIdSchema
	}),
	title("BeginGameRequest"));
export type BeginGameRequest = InferOutput<typeof BeginGameRequestSchema>;
