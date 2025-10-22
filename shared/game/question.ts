import { nonEmpty, number, optional, pipe, strictObject, string, type InferOutput } from "valibot";


// Information about a question, except the answer which is secret.
export const QuestionInfoSchema = strictObject({
	question: pipe(string(), nonEmpty()),
	// Source for the answer.
	source: optional(string()),
	// Date for which the answer was accurate.
	date: optional(string()),
});
export type QuestionInfo = InferOutput<typeof QuestionInfoSchema>;


export const QuestionAnswerInfoSchema = strictObject({
	...QuestionInfoSchema.entries,
	answer: number(),
});
export type QuestionAnswerInfo = InferOutput<typeof QuestionAnswerInfoSchema>;


export function stripAnswer(qa: QuestionAnswerInfo): QuestionInfo {
	return {
		question: qa.question,
		...(qa.source && { source: qa.source }),
		...(qa.date && { date: qa.date }),
	};
}
