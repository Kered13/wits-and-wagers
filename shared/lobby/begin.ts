import { type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";


// Create a new game from the given lobby. Can only be called by the Host of the lobby.
export const BeginGameRequestSchema = LobbyIdSchema;
export type BeginGameRequest = InferOutput<typeof BeginGameRequestSchema>;
