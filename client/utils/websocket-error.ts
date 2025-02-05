export class WebsocketError extends Error {
	public override readonly name = "WebsocketError";
	
	constructor(public readonly status: number, message: string) {
		super(`Websocket returned status ${status}: ${message}`);
	}
}
