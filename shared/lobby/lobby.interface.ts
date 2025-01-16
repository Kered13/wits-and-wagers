import { array, nonEmpty, object, pipe, regex, string, type InferOutput } from "valibot";


const RgbSchema = pipe(
	string(),
	regex(/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu));


// ID and join code of the lobby. This will become the GameId.
export const LobbyIdSchema = pipe(string(), nonEmpty());
export type LobbyId = InferOutput<typeof LobbyIdSchema>;


export const LobbyPlayerJsonSchema = object({
	// An ID used to uniquely identify the user.
	publicId: pipe(string(), nonEmpty()),
	// Display name for the user. Not unique.
	name: pipe(string(), nonEmpty()),
	// The color for the user. Unique within a lobby or game.
	color: RgbSchema
});
export type LobbyPlayerJson = InferOutput<typeof LobbyPlayerJsonSchema>;


// Represents the state of the lobby.
export const LobbyJsonSchema = object({
	title: pipe(string(), nonEmpty()),
	host: pipe(string(), nonEmpty()),
	players: array(LobbyPlayerJsonSchema)
});
export type LobbyJson = InferOutput<typeof LobbyJsonSchema>;
