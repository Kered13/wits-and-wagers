import { nonEmpty, optional, pipe, strictObject, string, title, union, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivateIdSchema, PrivatePlayerSchema } from "../player.js";
import { GameIdSchema } from "../game/game.js";


export const JOIN_LOBBY_PATH = "/joinlobby";


// Adds a new player to the lobby. This should not be called for the host.
export const JoinLobbyRequestSchema = pipe(
	strictObject({
		// ID of lobby to add the player to. Either the ID for players or for
		// spectators. The player will be added (or moved) as a player if this is
		// the player ID, or added/moved as a spectator if this is the spectator ID.
		lobbyId: LobbyIdSchema,
		// Name of the player.
		name: pipe(string(), nonEmpty()),
		// Optional PrivateId of the player. This can be used to rejoin a lobby. If
		// the player is already in the lobby, no new player will be added and the
		// same Privateid will be returned. If privateId is not provided or the
		// player is not already in the lobby, then the player will be added and a
		// new PrivateId will be returned that is valid in this lobby.
		privateId: optional(PrivateIdSchema)
	}),
	title("JoinLobbyRequest"));
export type JoinLobbyRequest = InferOutput<typeof JoinLobbyRequestSchema>;


export const JoinLobbyResponseSchema = union([
	strictObject({
		// Private player information for the new player.
		player: PrivatePlayerSchema,
	}),
	strictObject({
		// If this lobby has already begun, the GameId to redirect to.
		gameId: GameIdSchema,
	})
]);
export type JoinLobbyResponse = InferOutput<typeof JoinLobbyResponseSchema>;
