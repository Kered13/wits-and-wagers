import type { WebSocketUtil } from "./websocket.js";


export class Notifier<N> {
	private readonly clients: Set<WebSocketUtil> = new Set();
	
	constructor() {}
	
	public addClient(clientWs: WebSocketUtil): this {
		this.clients.add(clientWs);
		return this;
	}
	
	public removeClient(clientWs: WebSocketUtil): this {
		this.clients.delete(clientWs);
		return this;
	}
	
	// Notify all registered clients.
	public notifyClients(notification: N): this {
		this.clients.forEach(ws => this.notifyClient(ws, notification));
		return this;
	}
	
	// Notify a single client.
	public notifyClient(ws: WebSocketUtil, notification: N): this {
		ws.send(notification);
		return this;
	}
	
	// Close all connected sockets.
	public close(): this {
		this.clients.forEach(ws => ws.close());
		return this;
	}
};
