import { array, nonEmpty, pipe, regex, strictObject, string, type InferOutput } from "valibot";
import { PublicIdSchema } from "../player.js";


const RgbSchema = pipe(
	string(),
	regex(/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu));


// ID and join code of the lobby. This will become the GameId.
export const LobbyIdSchema = pipe(string(), nonEmpty());
export type LobbyId = InferOutput<typeof LobbyIdSchema>;


export const LobbyPlayerJsonSchema = strictObject({
	// An ID used to uniquely identify the user.
	publicId: PublicIdSchema,
	// Display name for the user. Not unique.
	name: pipe(string(), nonEmpty()),
	// The color for the user. Unique within a lobby or game.
	color: RgbSchema
});
export type LobbyPlayerJson = InferOutput<typeof LobbyPlayerJsonSchema>;


// Represents the state of the lobby.
export const LobbyJsonSchema = strictObject({
	// Title of the lobby and subsequent game.
	title: pipe(string(), nonEmpty()),
	// Public ID of the host.
	host: pipe(string(), nonEmpty()),
	// The public information of each player in the lobby.
	players: array(LobbyPlayerJsonSchema)
});
export type LobbyJson = InferOutput<typeof LobbyJsonSchema>;
