import { type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";


// Cancel the given lobby. Can only be called by the Host of the lobby.
export const CancelLobbyRequestSchema = LobbyIdSchema;
export type CancelLobbyRequest = InferOutput<typeof CancelLobbyRequestSchema>;
