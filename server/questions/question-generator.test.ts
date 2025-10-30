import { describe, expect, test } from "vitest";

import { QuestionGenerator } from "./question-generator.js";
import { HttpError } from "../utils/httperror";
import { QuestionAnswerInfo } from "../../shared/game/question.js";


function makeQuestion(): QuestionAnswerInfo {
	return {
		question: "Guess a number?",
		answer: 7
	};
}


describe("QuestionGenerator", () => {
	test("throws error if insufficient questions", () => {
		expect(() => new QuestionGenerator([], 7)).to.throw(HttpError);
		expect(() => new QuestionGenerator(new Array(6).fill(makeQuestion()), 7))
			.to.throw(HttpError);
	});
	
	test("does not throw error if sufficient questions", () => {
		expect(() => new QuestionGenerator(new Array(7).fill(makeQuestion()), 7))
			.to.not.throw();
	});
	
	test("nextQuestion returns questions", () => {
		const generator = new QuestionGenerator(new Array(7).fill(makeQuestion()), 7);
		
		expect(generator.nextQuestion()).to.deep.equal({
			question: "Guess a number?",
			answer: 7
		});
	});
	
	test("throws if nextQuestion called too many times", () => {
		const generator = new QuestionGenerator([makeQuestion()], 1);
		
		generator.nextQuestion();
		
		expect(() => generator.nextQuestion()).to.throw(HttpError);
	});
});
