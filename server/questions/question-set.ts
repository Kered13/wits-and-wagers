import { type QuestionAnswerInfo } from "../../shared/game/question.js";


export type QuestionSet = {
	fileName: string;
	id: number;
	questions: QuestionAnswerInfo[];
}
