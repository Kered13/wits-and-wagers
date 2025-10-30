import random from "random";

import { HttpError } from "../utils/httperror.js";
import { type QuestionAnswerInfo } from "../../shared/game/question.js";


export class QuestionGenerator {
	private readonly questions: QuestionAnswerInfo[];
	
	constructor(questions: QuestionAnswerInfo[], numQuestions: number) {
		if (questions.length < numQuestions) {
			throw new HttpError(500, `Insufficient questions. ${numQuestions} questions requests, but only ${questions.length} questions available.`);
		}
		this.questions = random.sample(questions, numQuestions);
	}
	
	public nextQuestion(): QuestionAnswerInfo {
		if (!this.questions.length) {
			throw new HttpError(500, `Ran out of questions. This should not happen.`);
		}
		return this.questions.pop()!;
	}
}
