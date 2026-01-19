import { type QuestionSet } from "./question-set.js";
import { type QuestionAnswerInfo } from "../../shared/game/question.js";
import { HttpError } from "../utils/httperror.js";


export class QuestionSetManager {
	private readonly questionSets: Map<number, QuestionSet> = new Map();
	private nextId: number = 0;
	
	constructor(questionSets?: Map<string, QuestionAnswerInfo[]>) {
		for (const [fileName, questions] of questionSets ?? []) {
			this.addQuestionSet(fileName, questions);
		}
	}
	
	public addQuestionSet(fileName: string, questions: QuestionAnswerInfo[]): void {
		const id = this.nextId++;
		this.questionSets.set(id, { id, fileName, questions });
	}
	
	public getQuestionSets(): Map<number, QuestionSet> {
		return new Map(this.questionSets);
	}
	
	public getQuestionSet(id: number): QuestionSet {
		const questionSet = this.questionSets.get(id);
		if (!questionSet) {
			throw new HttpError(400, `Question set ${id} does not exist.`);
		}
		return questionSet;
	}
}
