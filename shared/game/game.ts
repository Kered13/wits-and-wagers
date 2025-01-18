import { array, nonEmpty, number, pipe, strictObject, string, type InferOutput } from "valibot";

import { PrivateIdSchema } from "../player.js";
import { RgbSchema } from "../rgb.js";


// ID and join code of the game.
export const GameIdSchema = pipe(string(), nonEmpty());
export type GameId = InferOutput<typeof GameIdSchema>;


export const AddOneRequestSchema = strictObject({
	gameId: GameIdSchema,
	privateId: PrivateIdSchema
});
export type AddOneRequest = InferOutput<typeof AddOneRequestSchema>;


export const ResetRequestSchema = strictObject({
	gameId: GameIdSchema,
	privateId: PrivateIdSchema
});
export type ResetRequest = InferOutput<typeof ResetRequestSchema>;


export const GamePlayerJsonSchema = strictObject({
	name: pipe(string(), nonEmpty()),
	publicId: pipe(string(), nonEmpty()),
	color: RgbSchema,
	counter: number()
});
export type GamePlayerJson = InferOutput<typeof GamePlayerJsonSchema>;


// Represents the state of the game.
export const GameJsonSchema = strictObject({
	// The title of the game.
	title: pipe(string(), nonEmpty()),
	players: array(GamePlayerJsonSchema)
});
export type GameJson = InferOutput<typeof GameJsonSchema>;
