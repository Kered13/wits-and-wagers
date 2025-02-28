import { describe, expect, test } from "vitest";

import { QuestionError, QuestionLoadingError } from "./question-loading-error";


describe("QuestionLoadingError message", () => {
	test("message includes all errors", () => {
		const error = new QuestionLoadingError("file.csv", [
			new QuestionError("first cause", 3),
			new QuestionError("second cause", 5),
			new QuestionError("third cause", 8),
		]);
		
		expect(error.message).to.equal(
`Found formatting errors loading file file.csv:
* Line 3: first cause
* Line 5: second cause
* Line 8: third cause`);
	});
	
	test("message without line number", () => {
		const error = new QuestionLoadingError("file.csv", [
			new QuestionError("the cause"),
		]);
		
		expect(error.message).to.equal(
`Found formatting errors loading file file.csv:
* the cause`);
	});
	
	test("message with cause", () => {
		const error = new QuestionLoadingError("file.csv", new Error("root cause"));
		
		expect(error.message).to.equal("Error loading file file.csv: root cause");
	});
});

