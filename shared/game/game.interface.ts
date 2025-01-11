import { number, object, string, type InferOutput } from "valibot";


// ID and join code of the game.
export const GameIdSchema = string();
export type GameId = InferOutput<typeof GameIdSchema>;


// Represents the state of the game.
export const GameStateSchema = object({
	counter: number()
});
export type GameState = InferOutput<typeof GameStateSchema>;
