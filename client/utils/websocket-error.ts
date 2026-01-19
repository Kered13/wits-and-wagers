export class WebsocketError extends Error {
	public override readonly name = "WebsocketError";
	
	constructor(message: string, status?: number) {
		if (status !== undefined) {
			super(`${status}: ${message}`);
		} else {
			super(message);
		}
	}
}
