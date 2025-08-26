import { literal, strictObject, variant, type InferOutput } from "valibot";

import { LobbyIdSchema, LobbyStateSchema } from "./lobby.js";
import { GameIdSchema } from "../game/game.js";
import { WsErrorSchema } from "../ws-error.js";


// Represents an update to the lobby state.
export const LobbyUpdateSchema = strictObject({
	type: literal("update"),
	id: LobbyIdSchema,
	state: LobbyStateSchema
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


export const KickedFromLobbySchema = strictObject({
	type: literal("kicked"),
	id: LobbyIdSchema
});
export type KickedFromLobby = InferOutput<typeof KickedFromLobbySchema>;


// A notification about some change to the lobby.
export const LobbyNotificationSchema = 
	variant("type", [
		LobbyUpdateSchema,
		LobbyBeginGameSchema,
		LobbyCanceledSchema,
		KickedFromLobbySchema,
		WsErrorSchema
	]);
export type LobbyNotification = InferOutput<typeof LobbyNotificationSchema>;
