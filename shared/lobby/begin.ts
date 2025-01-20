import { strictObject, string, type InferOutput } from "valibot";

import { GameIdSchema } from "../game/game.js";
import { LobbyIdSchema } from "./lobby.js";


// Create a new game from the given lobby.
export const BeginGameRequestSchema = LobbyIdSchema;
export type BeginGameRequest = InferOutput<typeof BeginGameRequestSchema>;
