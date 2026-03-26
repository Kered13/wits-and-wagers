import { array, boolean, integer, maxValue, minValue, nonEmpty, number, optional, pipe, strictObject, string, title, type InferOutput } from "valibot";

import { LobbyIdSchema } from "./lobby.js";
import { PrivatePlayerSchema } from "../player.js";
import { QuestionSetIdSchema } from "../questions/questions.js";


export const CREATE_PATH = "/create";


export const LobbyOptionsSchema = strictObject({
	// Name of the lobby and subsequent game.
	title: pipe(string(), nonEmpty()),
	// Name of the host player.
	host: pipe(string(), nonEmpty()),
	// IDs of the question sets to use for the game.
	questionSets: pipe(array(QuestionSetIdSchema), nonEmpty()),
	// Maximum number of players. Default 7.
	maxPlayers: optional(pipe(number(), integer(), minValue(1), maxValue(7))),
	// Maximum number of rounds. Default 7.
	numberOfRounds: optional(number()),
	// Automatically end the question phase when all players have submitted their guesses. Default true.
	endQuestionPhaseWhenAllGuessesSubmitted: optional(boolean()),
	// Time limit for question phase. Default unlimited.
	questionPhaseDuration: optional(number()),
	// Time limit for question phase. Default unlimited.
	bettingPhaseDuration: optional(number()),
});
export type LobbyOptions = InferOutput<typeof LobbyOptionsSchema>;


// Creates a new lobby and adds the host to it.
export const CreateLobbyRequestSchema = pipe(
	strictObject({
		// Options for the lobby.
		options: LobbyOptionsSchema,
	}),
	title("CreateLobbyRequest"));
export type CreateLobbyRequest = InferOutput<typeof CreateLobbyRequestSchema>;


export const CreateLobbyResponseSchema = strictObject({
	// ID of the lobby and subsequent game.
	id: LobbyIdSchema,
	// ID for the lobby for spectators.
	spectatorId: LobbyIdSchema,
	// Private player information for the host.
	host: PrivatePlayerSchema
});
export type CreateLobbyResponse = InferOutput<typeof CreateLobbyResponseSchema>;
