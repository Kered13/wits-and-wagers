import type { WebSocketUtil } from "./websocket.js";


export class Notifier<N> {
	private readonly clients: Set<WebSocketUtil> = new Set();
	
	constructor() {}
	
	public addClient(clientWs: WebSocketUtil): void {
		this.clients.add(clientWs);
	}
	
	public removeClient(clientWs: WebSocketUtil): void {
		this.clients.delete(clientWs);
	}
	
	// Notify all registered clients.
	public notifyClients(notification: N): void {
		this.clients.forEach(ws => this.notifyClient(ws, notification));
	}
	
	// Notify a single client.
	public notifyClient(ws: WebSocketUtil, notification: N): void {
		ws.send(notification);
	}
};
