import { describe, expect, test } from "vitest";

import { type Question } from "./question.js";
import { QuestionGenerator } from "./question-generator.js";
import { HttpError } from "../utils/httperror";


function makeQuestion(): Question {
	return {
		question: "Guess a number?",
		answer: 7
	};
}


describe("QuestionGenerator", () => {
	test("throws error if insufficient questions", () => {
		expect(() => new QuestionGenerator([])).to.throw(HttpError);
		expect(() => new QuestionGenerator(new Array(6).fill(makeQuestion())))
			.to.throw(HttpError);
	});
	
	test("does not throw error if 7 or more questions", () => {
		expect(() => new QuestionGenerator(new Array(7).fill(makeQuestion())))
			.to.not.throw();
	});
	
	test("nextQuestion returns questions", () => {
		const generator = new QuestionGenerator(new Array(7).fill(makeQuestion()));
		
		expect(generator.nextQuestion()).to.deep.equal({
			question: "Guess a number?",
			answer: 7
		});
	});
});
