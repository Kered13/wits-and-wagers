import { nonEmpty, number, pipe, strictObject, string, type InferOutput } from "valibot";


export const QuestionSchema = strictObject({
	question: pipe(string(), nonEmpty()),
	answer: number()
});
export type Question = InferOutput<typeof QuestionSchema>;
