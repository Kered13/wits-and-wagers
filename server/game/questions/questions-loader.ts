import { parse } from "csv-parse/sync";
import { readFile } from "fs/promises";
import { array, assert } from "valibot";

import { QuestionSchema, type Question } from "./question.js";


export async function loadQuestionsFromJson(file: string): Promise<Question[]> {
	return parseJson(await read(file));
}


export function parseJson(jsonStr: string): Question[] {
	const questions = JSON.parse(jsonStr);
	assert(array(QuestionSchema), questions);
	return questions;
}


export async function loadQuestionsFromCsv(file: string): Promise<Question[]> {
	return parseCsvQuestions(await read(file));
}


export async function loadQuestionsFromTsv(file: string): Promise<Question[]> {
	return parseTsvQuestions(await read(file));
}


export function parseCsvQuestions(str: string): Question[] {
	return parseCsv(str, ",");
}


export function parseTsvQuestions(str: string): Question[] {
	return parseCsv(str, "\t");
}


async function read(file: string): Promise<string> {
	return await readFile(file, { encoding: "utf8" });
}


function parseCsv(csvStr: string, delimiter: string): Question[] {
	const question = parse(
		csvStr,
		{
			columns: ["question", "answer"],
			delimiter: delimiter,
			skip_empty_lines: true,
			cast: (value, context) => {
				if (context.index === 1) {
					return parseInt(value);
				}
				return value;
			}
		});
	assert(array(QuestionSchema), question);
	return question;
}
