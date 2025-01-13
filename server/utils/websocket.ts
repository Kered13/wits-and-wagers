import { WebSocket } from "ws";

import { HttpError } from "./httperror.js";
import { WebSocketRequestSchema, WebSocketResponse, type WebSocketError, type WebSocketRequest, type WebSocketSuccess } from "../../shared/websocket.interface.js";
import { is } from "valibot";


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
	
	public respond<T>(payload: T): this {
		const response: WebSocketSuccess<T> = {
			type: "success",
			status: 200,
			payload: payload
		};
		this.send(response);
		return this;
	}
	
	public error(error: HttpError): this {
		const response: WebSocketError = {
			type: "error",
			status: error.status,
			message: error.message
		};
		this.send(response);
		return this;
	}
	
	public onMethod<Res>(method: string, handler: (request: unknown) => Res): this {
		this.ws.on("message", (msg: string) => {
			try {
				const json = JSON.parse(msg);
				if (!is(WebSocketRequestSchema, json)) {
					throw new HttpError(400, `Bad Request: ${msg}`);
				}
				
				if (json.method !== method) {
					// Ignore. This may be handled by other method handlers.
					return;
				}
				this.respond(handler(json.payload));
			} catch (error: unknown) { 
				this.handleException(error);
			}
		});
		return this;
	};
	
	public onMessage(handler: (msg: string) => void): this {
		this.ws.on("message", (msg: string) => {
			try {
				handler(msg);
			} catch (error: unknown) {
				this.handleException(error);
			}
		});
		return this;
	}
	
	public onOpen(handler: () => void): this {
		this.ws.on("open", () => {
			try {
				handler();
			} catch (error: unknown) {
				this.handleException(error);
			}
		});
		return this;
	}
	
	public onClose(handler: () => void): this {
		this.ws.on("close", () => {
			try {
				handler();
			} catch (error: unknown) {
				this.handleException(error);
			}
		});
		return this;
	}
	
	private handleException(error: unknown) {
		if (!(error instanceof HttpError)) {
			throw error;
		}
		this.error(error);
	}
}