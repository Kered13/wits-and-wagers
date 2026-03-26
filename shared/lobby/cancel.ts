import { pipe, strictObject, title, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivateIdSchema } from "../player.js";


export const CANCEL_PATH = "/cancel";


// Cancel the given lobby. Can only be called by the Host of the lobby.
export const CancelLobbyRequestSchema = pipe(
	strictObject({
		lobbyId: LobbyIdSchema,
		requester: PrivateIdSchema
	}),
	title("CancelLobbyRequest"));
export type CancelLobbyRequest = InferOutput<typeof CancelLobbyRequestSchema>;
