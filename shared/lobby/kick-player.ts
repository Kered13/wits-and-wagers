import { pipe, strictObject, title, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivateIdSchema, PublicIdSchema } from "../player.js";


export const KICK_PLAYER_PATH = "/kickplayer";


// Kick a player from the lobby.
export const KickPlayerRequestSchema = pipe(
	strictObject({
		// ID of the lobby to remove the player from.
		lobbyId: LobbyIdSchema,
		// PublicId of the player to remove from the lobby.
		player: PublicIdSchema,
		// PrivateId of the requester. Must be the host to kick a player.
		requester: PrivateIdSchema
	}),
	title("KickPlayerRequest"));
export type KickPlayerRequest = InferOutput<typeof KickPlayerRequestSchema>;


export const KickPlayerResponseSchema = strictObject({});
export type KickPlayerResponse = InferOutput<typeof KickPlayerResponseSchema>;
