import { parseIntSafe } from "complete-common";
import { CsvError, parse, type CastingContext } from "csv-parse/sync";
import { opendir, readFile } from "fs/promises";
import path from "path";
import * as valibot from "valibot";

import { QuestionError, QuestionLoadingError } from "./question-loading-error.js";
import { QuestionAnswerInfoSchema, type QuestionAnswerInfo } from "../../shared/game/question.js";


export async function findQuestionSetsOnFilesystem(dir: string): Promise<Map<string, QuestionAnswerInfo[]>> {
	const questionSets = new Map<string, QuestionAnswerInfo[]>();
	for await (const file of await opendir(dir, { recursive: true })) {
		if (!file.isFile()) {
			continue;
		}
		const fullFilename = path.join(file.parentPath, file.name)
		const ext = path.extname(fullFilename);
		try {
			const questions =
				ext === ".json" ? await loadQuestionsFromJson(fullFilename) :
				ext === ".csv" ? await loadQuestionsFromCsv(fullFilename) :
				ext === ".tsv" ? await loadQuestionsFromTsv(fullFilename) : undefined
			if (questions !== undefined) {
				questionSets.set(file.name, questions);
			} else {
				console.log(`Ignoring file ${fullFilename}, unrecognized extension.`);
			}
		} catch (err) {
			if (err instanceof QuestionLoadingError) {
				console.warn(`Error loading questions from ${fullFilename}: ${err}`);
			} else {
				throw err;
			}
		}
	}
	return questionSets;
}


// Throws QuestionLoadingError if the input file is invalid.
export async function loadQuestionsFromJson(file: string): Promise<QuestionAnswerInfo[]> {
	try {
		return parseJson(await read(file));
	} catch (err) {
		if (err instanceof SyntaxError || err instanceof valibot.ValiError) {
			throw new QuestionLoadingError(file, err);
		}
		throw err;
	}
}


// Throws QuestionLoadingError if the input file is invalid.
export async function loadQuestionsFromCsv(file: string): Promise<QuestionAnswerInfo[]> {
	return loadFromCsv(file, ",");
}


// Throws QuestionLoadingError if the input file is invalid.
export async function loadQuestionsFromTsv(file: string): Promise<QuestionAnswerInfo[]> {
	return loadFromCsv(file, "\t");
}


async function loadFromCsv(file: string, delimiter: string): Promise<QuestionAnswerInfo[]> {
	try {
		const questionsOrErrors = parseCsv(await read(file), delimiter);
		if (questionsOrErrors[0]! instanceof QuestionError) {
			throw new QuestionLoadingError(file, questionsOrErrors as QuestionError[]);
		}
		return questionsOrErrors as QuestionAnswerInfo[];
	} catch (err) {
		if (err instanceof CsvError) {
			throw new QuestionLoadingError(file, err);
		}
		throw err;
	}
}


async function read(file: string): Promise<string> {
	return await readFile(file, { encoding: "utf8" });
}


// Exported for testing purposes.
export function parseJson(jsonStr: string): QuestionAnswerInfo[] {
	const questions = JSON.parse(jsonStr);
	return valibot.parse(valibot.array(QuestionAnswerInfoSchema), questions);
}


// Exported for testing purposes.
export function parseCsv(csvStr: string, delimiter: string): QuestionAnswerInfo[] | QuestionError[] {
	const errors: QuestionError[] = [];
	
	// Attempts to parse the given value. If parsing fails, the resulting error
	// is pushed onto the error list.
	type Parser<T> = (value: string, context: CastingContext) => T | QuestionError;
	function cast<T>(parser: Parser<T>, value: string, context: CastingContext): T | undefined {
		const valueOrError = parser(value, context);
		if (valueOrError instanceof QuestionError) {
			errors.push(valueOrError);
			return undefined;
		}
		return valueOrError;
	};
	
	const questions: Partial<QuestionAnswerInfo>[] = parse(
		csvStr,
		{
			delimiter: delimiter,
			skipEmptyLines: true,
			trim: true,
			relaxColumnCount: true,
			relaxQuotes: true,
			onRecord: (record, context): Partial<QuestionAnswerInfo> => {
				// Validate that the question and answer are present and
				// properly formatted, and that no unexpected data is present.
				const question = cast(parseQuestion, record[0], context);
				if (context.index === 1) {
					errors.push(new QuestionError(`Missing answer for question "${question}".`, context.lines));
					return { question };
				}
				const answer = cast(parseAnswer, record[1], context);
				const source = record[2];
				const date = record[3];
				for (let i = 4; i < context.index; i++) {
					errors.push(new QuestionError(`Unexpected column ${i} with value "${record[i]}".`, context.lines));
				}
				return {
					question,
					answer,
					...(source && { source }),
					...(date && { date }),
				};
			}
		});
	
	if (errors.length > 0) {
		return errors;
	}
	return valibot.parse(valibot.array(QuestionAnswerInfoSchema), questions);
}


function parseQuestion(value: string, context: CastingContext): string | QuestionError {
	if (value === "") {
		return new QuestionError("Question may not be empty.", context.lines);
	}
	return value;
}


function parseAnswer(value: string, context: CastingContext): number | QuestionError {
	const answer = parseIntSafe(value);
	if (answer === undefined) {
		return new QuestionError(`Could not parse "${value}" as an integer.`, context.lines);
	} else if (answer <= 0) {
		return new QuestionError(`Answer ${answer} is not strictly positive.`, context.lines);
	}
	return answer;
}
