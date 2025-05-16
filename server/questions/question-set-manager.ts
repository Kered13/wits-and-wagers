import { type QuestionSet } from "./question-set.js";
import { type Question } from "./question.js";


export class QuestionSetManager {
	private readonly questionSets: Map<number, QuestionSet> = new Map();
	private nextId: number = 0;
	
	constructor(questionSets?: Map<string, Question[]>) {
		for (const [fileName, questions] of questionSets ?? []) {
			this.addQuestionSet(fileName, questions);
		}
	}
	
	public addQuestionSet(fileName: string, questions: Question[]): void {
		const id = this.nextId++;
		this.questionSets.set(id, { id, fileName, questions });
	}
	
	public getQuestionSets(): Map<number, QuestionSet> {
		return new Map(this.questionSets);
	}
	
	public getQuestionSet(id: number): QuestionSet | undefined {
		return this.questionSets.get(id);
	}
}
