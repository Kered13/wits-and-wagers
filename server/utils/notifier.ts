import type { Serializable } from "./serializable.js";
import type { WebSocketUtil } from "./websocket.js";


interface StateUpdate<T, Id> {
	type: "update";
	id: Id;
	state: T;
}


export class Notifier<T, S extends Serializable<T>, Id> {
	private readonly clients: Set<WebSocketUtil>;
	
	constructor(public readonly id: Id, public readonly state: S) {
		this.clients = new Set();
	}
	
	public addClient(clientWs: WebSocketUtil): void {
		this.clients.add(clientWs);
	}
	
	public removeClient(clientWs: WebSocketUtil): void {
		this.clients.delete(clientWs);
	}
	
	// Notify all registered clients.
	public notifyClients(): void {
		const update: StateUpdate<T, Id> = {
			type: "update",
			id: this.id,
			state: this.state.toJson()
		};
		this.clients.forEach(clientWs => {
			clientWs.send(update);
		});
	}
	
	// Notify a single client.
	public notifyClient(ws: WebSocketUtil): void {
		const update: StateUpdate<T, Id> = {
			type: "update",
			id: this.id,
			state: this.state.toJson()
		};
		ws.send(update);
	}
};
