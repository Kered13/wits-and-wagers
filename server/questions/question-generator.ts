import random from "random";

import { HttpError } from "../utils/httperror.js";
import { type QuestionAnswerInfo } from "../../shared/game/question.js";


export class QuestionGenerator {
	private readonly questions: QuestionAnswerInfo[];
	
	constructor(questions: QuestionAnswerInfo[]) {
		if (questions.length < 7) {
			throw new HttpError(500, "Insufficient questions. At least 7 questions must be available.");
		}
		this.questions = random.shuffle(questions).slice(0, 7);
	}
	
	public nextQuestion(): QuestionAnswerInfo {
		if (!this.questions) {
			throw new HttpError(500, "More than 7 questions were requested for one game.");
		}
		return this.questions.pop()!;
	}
}
