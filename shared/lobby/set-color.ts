import { strictObject, union, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivateIdSchema, PublicIdSchema } from "../player.js";
import { RgbSchema } from "../rgb.js";


export const SET_COLOR_PATH = "/setcolor";


// Set the color for a player in the lobby.
export const SetColorRequestSchema = strictObject({
	// ID of the lobby.
	lobbyId: LobbyIdSchema,
	// PublicId of the player to set the color for.
	player: PublicIdSchema,
	// New color for the player.
	color: RgbSchema,
	// PrivateId of the requester. Must be the host or the the player.
	requester: PrivateIdSchema,
});
export type SetColorRequest = InferOutput<typeof SetColorRequestSchema>;


export const SetColorResponseSchema = strictObject({});
export type SetColorResponse = InferOutput<typeof SetColorResponseSchema>;
