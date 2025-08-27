import { literal, strictObject, union, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivateIdSchema, PublicIdSchema } from "../player.js";


export const MOVE_PLAYER_PATH = "/moveplayer";


// Move a player to player or spectator role in a lobby.
export const MovePlayerRequestSchema = strictObject({
	// ID of the lobby.
	lobbyId: LobbyIdSchema,
	// PublicId of the player to move.
	player: PublicIdSchema,
	// New role for the player.
	role: union([literal("player"), literal("spectator")]),
	// PrivateId of the requester. Must be the host to move a player.
	requester: PrivateIdSchema
});
export type MovePlayerRequest = InferOutput<typeof MovePlayerRequestSchema>;


export const MovePlayerResponseSchema = strictObject({});
export type MovePlayerResponse = InferOutput<typeof MovePlayerResponseSchema>;
