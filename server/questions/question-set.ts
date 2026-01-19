import { type QuestionAnswerInfo } from "../../shared/game/question.js";
import { type QuestionSetId } from "../../shared/questions/questions.js";


export type QuestionSet = {
	fileName: string;
	id: QuestionSetId;
	questions: QuestionAnswerInfo[];
}
