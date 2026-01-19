import { parse } from "valibot";

import { type QuestionSet } from "./question-set.js";
import { type QuestionAnswerInfo } from "../../shared/game/question.js";
import { HttpError } from "../utils/httperror.js";
import { QuestionSetIdSchema, type QuestionSetId } from "../../shared/questions/questions.js";


export class QuestionSetManager {
	private readonly questionSets: Map<QuestionSetId, QuestionSet> = new Map();
	private nextId: number = 0;
	
	constructor(questionSets?: Map<string, QuestionAnswerInfo[]>) {
		for (const [fileName, questions] of questionSets ?? []) {
			this.addQuestionSet(fileName, questions);
		}
	}
	
	public addQuestionSet(fileName: string, questions: QuestionAnswerInfo[]): void {
		const id = parse(QuestionSetIdSchema, this.nextId++);
		this.questionSets.set(id, { id, fileName, questions });
	}
	
	public getQuestionSets(): Map<QuestionSetId, QuestionSet> {
		return new Map(this.questionSets);
	}
	
	public getQuestionSet(id: QuestionSetId): QuestionSet {
		const questionSet = this.questionSets.get(id);
		if (!questionSet) {
			throw new HttpError(400, `Question set ${id} does not exist.`);
		}
		return questionSet;
	}
}
