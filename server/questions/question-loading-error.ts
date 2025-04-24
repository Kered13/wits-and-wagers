export class QuestionError {
	constructor(
		public readonly message: string,
		public readonly line?: number) {}
}

export class QuestionLoadingError extends Error {
	constructor(file: string, errors: QuestionError[]);
	constructor(file: string, cause: Error);
	constructor(file: string, errorsOrCause: QuestionError[] | Error) {
		if (errorsOrCause instanceof Error) {
			const cause = errorsOrCause;
			super(`Error loading file ${file}: ${cause.message}`, { cause });
		} else {
			const errors = errorsOrCause;
			const message = `Found formatting errors loading file ${file}:\n`
				+ errors.map(err => "* " + (err.line ? `Line ${err.line}: ` : "") + err.message).join("\n");
			super(message);
		}
	}
}
