import { brand, type InferOutput, number, pipe } from "valibot";


export const QUESTIONS_API_ROOT = "/api/questions";

export const QuestionSetIdSchema = pipe(number(), brand("QuestionSetId"));
export type QuestionSetId = InferOutput<typeof QuestionSetIdSchema>;
