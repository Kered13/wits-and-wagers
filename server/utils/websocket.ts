import { getTitle, is, type GenericSchema } from "valibot";
import { WebSocket } from "ws";

import { HttpError } from "./httperror.js";
import { verifyRequest } from "./verifyrequest.js";
import { WebSocketRequestSchema } from "../../shared/websocket.interface.js";
import { type WsError } from "../../shared/ws-error.js";


export class WebSocketUtil {
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
	
	public onMethod<ReqSchema extends GenericSchema<unknown, Req>, Req, Res>(
			method: string,
			schema: ReqSchema,
			handler: (request: Req) => Res): this {
		this.onMessage<ReqSchema, Req, Res>(method, schema, handler, (response: Res) => this.send(response));
		return this;
	};
	
	public onNotification<ReqSchema extends GenericSchema<unknown, Req>, Req>(
			method: string,
			schema: ReqSchema,
			handler: (request: Req) => void): this {
		this.onMessage<ReqSchema, Req, void>(method, schema, handler, (_: void) => {});
		return this;
	};
	
	public onOpen(handler: () => void): this {
		this.ws.on("open", handler);
		return this;
	}
	
	public onClose(handler: () => void): this {
		this.ws.on("close", handler);
		return this;
	}
	
	private onMessage<ReqSchema extends GenericSchema<unknown, Req>, Req, Res>(
			method: string,
			schema: ReqSchema,
			handler: (request: Req) => Res,
			responseProcessor: (result: Res) => void): this {
		this.ws.on("message", (msg: string) => {
			try {
				const payload = this.validateMessageForMethod<Req>(method, msg);
				if (!payload) {
					// Ignore. This may be handled by other method handlers.
					return;
				}
				
				const request = verifyRequest(
					payload, schema, `Invalid ${getTitle(schema)}: ${payload}`);
				
				responseProcessor(handler(request));
			} catch (err) {
				this.handleError(err);
			}
		});
		return this;
	}
	
	private validateMessageForMethod<Req>(method: string, msg: string): Req | undefined {
		const json = JSON.parse(msg);
		if (!is(WebSocketRequestSchema, json)) {
			throw new HttpError(400, `Bad Request: ${msg}`);
		}
		
		if (json.method !== method) {
			return undefined;
		}
		return json.payload;
	}
	
	private handleError(err: unknown): void {
		const httpErr: HttpError = err instanceof HttpError ? err
			: err instanceof Error ? new HttpError(500, "Internal Server Error", err)
			: new HttpError(500, `Internal Server Error: ${err} | ${JSON.stringify(err)}`);
		
		console.log(httpErr.detailedString());
		this.error(httpErr.status, httpErr.message);
		this.close();
	}
	
	private ping(): void {
		this.ws.ping();
		this.pingTimeout = setTimeout(() => {
			console.log(`Heartbeat failed, terminating websocket ${this.id}.`);
			this.ws.terminate();
		}, WebSocketUtil.HEARTBEAT_TIMEOUT_MS);
	}
}
