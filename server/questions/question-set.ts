import { type Question } from "./question.js";


export type QuestionSet = {
	fileName: string;
	id: number;
	questions: Question[];
}
