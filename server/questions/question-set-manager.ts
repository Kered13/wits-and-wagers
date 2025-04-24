import type { Question } from "./question.js";


export class QuestionSetManager {
	private readonly questionSets: Map<string, Question[]> = new Map();
	
	constructor(questionSets?: Map<string, Question[]>) {
		this.questionSets = questionSets ?? new Map();
	}
	
	public addQuestionSet(name: string, questions: Question[]): void {
		this.questionSets.set(name, questions);
	}
	
	public getQuestionSets(): Map<string, Question[]> {
		return new Map(this.questionSets);
	}
	
	public getQuestionSet(name: string): Question[] | undefined {
		return this.questionSets.get(name);
	}
}
