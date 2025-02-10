import { is } from "valibot";
import { WebSocket } from "ws";

import { HttpError } from "./httperror.js";
import { WebSocketRequestSchema } from "../../shared/websocket.interface.js";


export class WebSocketUtil {
	constructor(private readonly ws: WebSocket) {
		this.ws.on("error", error => {
			if (!(error instanceof HttpError)) {
				console.error(error.stack);
				ws.close(500, error.message);
			} else {
				ws.close(error.status, error.message);
			}
		});
	}
	
	public send<T>(payload: T): this {
		this.ws.send(JSON.stringify(payload));
		return this;
	}
	
	public close(): this {
		this.ws.close();
		return this;
	}
	
	public onMethod<Res>(method: string, handler: (request: unknown) => Res): this {
		this.ws.on("message", (msg: string) => {
			const json = JSON.parse(msg);
			if (!is(WebSocketRequestSchema, json)) {
				throw new HttpError(400, `Bad Request: ${msg}`);
			}
			
			if (json.method !== method) {
				// Ignore. This may be handled by other method handlers.
				return;
			}
			handler(json.payload);
		});
		return this;
	};
	
	public onMessage(handler: (msg: string) => void): this {
		this.ws.on("message", handler);
		return this;
	}
	
	public onOpen(handler: () => void): this {
		this.ws.on("open", handler);
		return this;
	}
	
	public onClose(handler: () => void): this {
		this.ws.on("close", handler);
		return this;
	}
}
