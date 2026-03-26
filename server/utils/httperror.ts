export class HttpError extends Error {
	constructor(public readonly status: number, message: string, cause?: Error) {
		super(message, { cause: cause });
	}
	
	public override toString(): string {
		return `HttpError ${this.status}: ${this.message}`;
	}
	
	public detailedString(): string {
		let message = this.toString()
		if (this.cause) {
			// @ts-expect-error TS does not recognize the stack member of `Error`.
			message += `\n  Caused by: ${this.cause.stack}`;
		}
		return message;
	}
}
