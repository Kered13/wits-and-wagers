import { strictObject, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivateIdSchema } from "../player.js";


// Cancel the given lobby. Can only be called by the Host of the lobby.
export const CancelLobbyRequestSchema = strictObject({
	lobbyId: LobbyIdSchema,
	requester: PrivateIdSchema
});
export type CancelLobbyRequest = InferOutput<typeof CancelLobbyRequestSchema>;
