export class HttpError extends Error {
	constructor(public readonly status: number, message: string, cause?: Error) {
		super(message, { cause: cause });
	}
}
