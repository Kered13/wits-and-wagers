import { array, nonEmpty, pipe, strictObject, string, type InferOutput } from "valibot";

import { PublicIdSchema } from "../player.js";
import { RgbSchema } from "../rgb.js";


export const LOBBY_API_ROOT = "/api/lobby";


// ID and join code of the lobby. This will become the GameId.
export const LobbyIdSchema = pipe(string(), nonEmpty());
export type LobbyId = InferOutput<typeof LobbyIdSchema>;


export const LobbySpectatorSchema = strictObject({
	// An ID used to uniquely identify the user.
	publicId: PublicIdSchema,
	// Display name for the user. Not unique.
	name: pipe(string(), nonEmpty()),
});
export type LobbySpectator = InferOutput<typeof LobbySpectatorSchema>;


export const LobbyPlayerSchema = strictObject({
	// An ID used to uniquely identify the user.
	publicId: PublicIdSchema,
	// Display name for the user. Not unique.
	name: pipe(string(), nonEmpty()),
	// The color for the user. Unique within a lobby or game.
	color: RgbSchema
});
export type LobbyPlayer = InferOutput<typeof LobbyPlayerSchema>;


// Represents the state of the lobby.
export const LobbyStateSchema = strictObject({
	// Title of the lobby and subsequent game.
	title: pipe(string(), nonEmpty()),
	// Public ID of the host.
	host: pipe(PublicIdSchema, nonEmpty()),
	// The public information of each player in the lobby.
	players: array(LobbyPlayerSchema),
	// The public information of each spectator in the lobby.
	spectators: array(LobbySpectatorSchema),
});
export type LobbyState = InferOutput<typeof LobbyStateSchema>;
