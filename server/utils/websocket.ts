import { is } from "valibot";
import { WebSocket } from "ws";

import { WebSocketRequestSchema } from "../../shared/websocket.interface.js";
import type { WsError } from "../../shared/ws-error.js";


export class WebSocketUtil {
	// TODO: Set these timers for production.
	private static readonly HEARTBEAT_INTERVAL_MS = 5000;
	private static readonly HEARTBEAT_TIMEOUT_MS = 1000;
	
	private keepalive: NodeJS.Timeout;
	private pingTimeout: NodeJS.Timeout | undefined;;
	
	constructor(private readonly ws: WebSocket, private readonly id: string) {
		console.log(`Connected websocket ${this.id}.`);
		this.keepalive = setInterval(() => this.ping(), WebSocketUtil.HEARTBEAT_INTERVAL_MS);
		this.ws.on("error", error => () => console.error(`Error: ${error}`));
		this.ws.on("pong", () => clearInterval(this.pingTimeout));
		this.ws.on("close", () => {
			console.log(`Closed websocket ${this.id}.`);
			clearInterval(this.keepalive);
			clearInterval(this.pingTimeout);
		});
	}
	
	public send<T>(payload: T): this {
		this.ws.send(JSON.stringify(payload));
		return this;
	}
	
	public error(status: number, message: string): this {
		this.send<WsError>({
			type: "error",
			status,
			message,
		});
		return this;
	}
	
	public close(): this {
		this.ws.close();
		return this;
	}
	
	// TODO: Remove when disconnect testing is no longer needed.
	public terminate(): this {
		this.ws.terminate();
		return this;
	}
	
	public onMethod<Res>(method: string, handler: (request: unknown) => Res): this {
		this.ws.on("message", (msg: string) => {
			const json = JSON.parse(msg);
			if (!is(WebSocketRequestSchema, json)) {
				console.error(`Bad Request: ${msg}`);
				this.error(400, `Bad Request: ${msg}`);
				return;
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
	
	private ping(): void {
		this.ws.ping();
		this.pingTimeout = setTimeout(() => {
			console.log(`Heartbeat failed, terminating websocket ${this.id}.`);
			this.ws.terminate();
		}, WebSocketUtil.HEARTBEAT_TIMEOUT_MS);
	}
}
