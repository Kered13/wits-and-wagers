import Multimap from "multimap";

import { WebSocketUtil } from "./websocket.js";
import type { PrivateId } from "../../shared/player.js";


export class Notifier<N> {
	private readonly idToClients: Multimap<PrivateId, WebSocketUtil> = new Multimap();
	private readonly clientToId: Map<WebSocketUtil, PrivateId> = new Map();
	
	constructor() {}
	
	public hasClients(id: PrivateId): boolean {
		return this.idToClients.has(id);
	}
	
	public addClient(id: PrivateId, ws: WebSocketUtil): this {
		this.idToClients.set(id, ws);
		this.clientToId.set(ws, id);
		return this;
	}
	
	public removeClient(id: PrivateId, ws: WebSocketUtil): this {
		this.clientToId.delete(ws);
		this.idToClients.delete(id, ws);
		
		// Due to a bug in Multimap, if this was the last value for the key the
		// key will not be properly deleted. We clean that up here.
		if (!this.idToClients.get(id).length) {
			this.idToClients.delete(id);
		}
		return this;
	}
	
	// Notify all registered clients.
	public notifyClients(notification: N): this {
		for (const ws of this.clientToId.keys()) {
			this.notifyClient(ws, notification);
		}
		return this;
	}
	
	// Notify a single client.
	public notifyClient(ws: WebSocketUtil, notification: N): this {
		ws.send(notification);
		return this;
	}
	
	// Close all connected sockets.
	public close(): this {
		for (const ws of this.clientToId.keys()) {
			ws.close();
		}
		return this;
	}
};
