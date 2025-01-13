import { array, custom, nonEmpty, object, pipe, string, type InferOutput } from "valibot";


const RgbSchema = custom<string>((input) =>
	typeof input === "string" ? /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/iu.test(input) : false
);


// ID and join code of the lobby. This will become the GameId.
export const LobbyIdSchema = string();
export type LobbyId = InferOutput<typeof LobbyIdSchema>;


export const PlayerSchema = object({
	id: pipe(string(), nonEmpty()),
	name: pipe(string(), nonEmpty()),
	color: RgbSchema
});
export type Player = InferOutput<typeof PlayerSchema>;


// Represents the state of the lobby.
export const LobbyStateSchema = object({
	title: pipe(string(), nonEmpty()),
	host: pipe(string(), nonEmpty()),
	players: array(PlayerSchema)
});
export type LobbyState = InferOutput<typeof LobbyStateSchema>;
