import { array, nonEmpty, number, pipe, strictObject, string, type InferOutput } from "valibot";


export const GET_QUESTION_SETS_PATH = "/getquestionsets";


// Create a new game from the given lobby. Can only be called by the Host of the lobby.
export const GetQuestionSetsRequestSchema = strictObject({});
export type GetQuestionSetsRequest = InferOutput<typeof GetQuestionSetsRequestSchema>;

export const GetQuestionSetsResponseSchema = array(
	strictObject({
		// Name of the question set.
		name: pipe(string(), nonEmpty()),
		// Number of questions in the set.
		size: number(),
	})
);
export type GetQuestionSetsResponse = InferOutput<typeof GetQuestionSetsResponseSchema>;
