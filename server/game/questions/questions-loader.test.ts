import { expect, test } from "vitest";

import { loadQuestionsFromCsv, loadQuestionsFromJson, loadQuestionsFromTsv, parseCsvQuestions, parseJson, parseTsvQuestions } from "./questions-loader.js"


test("parse JSON", () => {
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


test("parse CSV", () => {
	const json = `
The first question.,42
"The second question, yes?", 7
"The ""third"" question.", 10
`;
	
	expect(parseCsvQuestions(json)).to.have.deep.members([
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


test("parse TSV", () => {
	const json = `
The first question.	42
"The second question, yes?"	7
"The ""third"" question."	10
`;

	expect(parseTsvQuestions(json)).to.have.deep.members([
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


test("load CSV", async () => {
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


test("load TSV", async () => {
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
