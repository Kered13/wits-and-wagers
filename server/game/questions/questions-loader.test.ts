import { ValiError } from "valibot";
import { describe, expect, test } from "vitest";

import { loadQuestionsFromCsv, loadQuestionsFromJson, loadQuestionsFromTsv, parseCsv, parseJson } from "./questions-loader.js"
import { QuestionError, QuestionLoadingError } from "./question-loading-error.js";


describe("parse JSON", () => {
	test("succeeds", () => {
		const questions = [
			{
				question: "The first question.",
				answer: 42
			},
			{
				question: "The second question.",
				answer: 7
			}
		];
		
		expect(parseJson(JSON.stringify(questions)))
			.to.have.deep.members(questions);
	});
	
	test("throws ValiError on invalid input", () => {
		const questions = [
			{
				answer: 42
			},
			{
				question: "The second question.",
				answer: 7
			}
		];

		expect(() => parseJson(JSON.stringify(questions)))
			.to.throw(ValiError);
	});
});


test("load JSON", async () => {
	expect(await loadQuestionsFromJson("server/game/questions/testdata/questions.json"))
		.to.have.deep.members([
			{
				question: "The first question.",
				answer: 42
			},
			{
				question: "The second question.",
				answer: 7
			}
		]);
});


describe("parseCsv", () => {
	test("CSV succeeds", () => {
		const csv = `
			The first question.,42
			"The second question, yes?", 7
			"The ""third"" question.", 10`;
		
		expect(parseCsv(csv, ",")).to.have.deep.members([
			{
				question: "The first question.",
				answer: 42
			},
			{
				question: "The second question, yes?",
				answer: 7
			},
			{
				question: "The \"third\" question.",
				answer: 10
			}
		]);
	});
	
	test("TSV succeeds", () => {
		const csv = `
The first question.	42
"The second question, yes?"	7
"The ""third"" question."	10`;
		
		expect(parseCsv(csv, "\t")).to.have.deep.members([
			{
				question: "The first question.",
				answer: 42
			},
			{
				question: "The second question, yes?",
				answer: 7
			},
			{
				question: "The \"third\" question.",
				answer: 10
			}
		]);
	});
	
	test("returns errors on invalid input", () => {
		const csv = `
			,42
			Answer not a number, nan
			Answer is not positive, 0, what's this?
			Missing an answer`;
		
		expect(parseCsv(csv, ",")).to.have.deep.members([
			new QuestionError("Question may not be empty.", 2),
			new QuestionError("Could not parse \"nan\" as an integer.", 3),
			new QuestionError("Answer 0 is not strictly positive.", 4),
			new QuestionError("Unexpected column 2 with value \"what's this?\".", 4),
			new QuestionError("Missing answer for question \"Missing an answer\".", 5)
		]);
	});
});


describe("load CSV", () => {
	test("succeeds", async () => {
		expect(await loadQuestionsFromCsv("server/game/questions/testdata/questions.csv"))
			.to.have.deep.members([
				{
					question: "The first question.",
					answer: 42
				},
				{
					question: "The second question, yes?",
					answer: 7
				},
				{
					question: "The \"third\" question.",
					answer: 10
				}
			]);
	});
	
	test("throws QuestionLoadingError on invalid input", async () => {
		await expect(async () => await loadQuestionsFromCsv("server/game/questions/testdata/invalid-questions.csv"))
			.rejects.toThrow(QuestionLoadingError);
	});
});


describe("load TSV", () => {
	test("succeeds", async () => {
		expect(await loadQuestionsFromTsv("server/game/questions/testdata/questions.tsv"))
			.to.have.deep.members([
				{
					question: "The first question.",
					answer: 42
				},
				{
					question: "The second question, yes?",
					answer: 7
				},
				{
					question: "The \"third\" question.",
					answer: 10
				}
			]);
	});
	
	test("throws QuestionLoadingError on invalid input", async () => {
		await expect(async () => await loadQuestionsFromCsv("server/game/questions/testdata/invalid-questions.tsv"))
			.rejects.toThrow(QuestionLoadingError);
	});
});
