import { nonEmpty, number, object, pipe, string, type InferOutput } from "valibot";


// ID and join code of the game.
export const GameIdSchema = pipe(string(), nonEmpty());
export type GameId = InferOutput<typeof GameIdSchema>;


// Represents the state of the game.
export const GameJsonSchema = object({
	// The title of the game.
	title: pipe(string(), nonEmpty()),
	counter: number()
});
export type GameJson = InferOutput<typeof GameJsonSchema>;
