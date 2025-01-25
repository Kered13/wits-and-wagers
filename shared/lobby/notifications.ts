import { literal, number, strictObject, string, variant, type InferOutput } from "valibot";

import { LobbyIdSchema, LobbyJsonSchema } from "./lobby.js";
import { GameIdSchema } from "../game/game.js";


// Represents an update to the lobby state.
export const LobbyUpdateSchema = strictObject({
	type: literal("update"),
	id: LobbyIdSchema,
	state: LobbyJsonSchema
});
export type LobbyUpdate = InferOutput<typeof LobbyUpdateSchema>;


// Indicates that the game for this lobby has begun.
export const LobbyBeginGameSchema = strictObject({
	type: literal("begin-game"),
	id: LobbyIdSchema,
	// Game ID of the new game. In practice, this is the same as the lobby ID.
	gameId: GameIdSchema
});
export type LobbyBeginGame = InferOutput<typeof LobbyBeginGameSchema>;


// Indicates that this lobby has been canceled.
export const LobbyCanceledSchema = strictObject({
	type: literal("canceled"),
	id: LobbyIdSchema
});
export type LobbyCanceled = InferOutput<typeof LobbyCanceledSchema>;


// Indicates an error communicated to the client.
export const LobbyErrorSchema = strictObject({
	type: literal("error"),
	status: number(),
	message: string()
});
export type LobbyError = InferOutput<typeof LobbyErrorSchema>;


// A notification about some change to the lobby.
export const LobbyNotificationSchema = 
	variant("type", [
		LobbyUpdateSchema,
		LobbyBeginGameSchema,
		LobbyCanceledSchema,
		LobbyErrorSchema
	]);
export type LobbyNotification = InferOutput<typeof LobbyNotificationSchema>;
