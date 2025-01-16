import * as uuid from "uuid";
import { assert } from "valibot";

import { Game } from "../game/game.js";
import { type LobbyPlayerJson, type LobbyJson } from "../../shared/lobby/lobby.js";
import type { PrivatePlayer } from "../../shared/player.js";


export class LobbyPlayer {
	constructor(
		// An ID used to authenticate the user in RPCs.
		public readonly privateId: string,
		// An ID used to uniquely identify the user.
		public readonly publicId: string,
		// Display name for the user. Not unique.
		public readonly name: string,
		// The color for the user. Unique within a lobby or game.
		public readonly color: string) {}
	
	public toJson(): LobbyPlayerJson {
		return {
			publicId: this.publicId,
			name: this.name,
			color: this.color
		};
	}
	
	public toPrivateJson(): PrivatePlayer {
		return {
			...this.toJson(),
			privateId: this.privateId
		};
	}
};


export class Lobby {
	private readonly players: LobbyPlayer[] = [];
	// Public ID of the host for this lobby.
	private readonly host: LobbyPlayer;
	
	constructor(
			private readonly title: string,
			hostName: string) {
		this.host = this.addPlayer(hostName);
	}
	
	public getHost(): LobbyPlayer {
		return this.host;
	}
	
	public addPlayer(name: string): LobbyPlayer {
		const { privateId, publicId } = this.generatePlayerIds();
		this.players.push(new LobbyPlayer(privateId, publicId, name, this.generateColor()));
		const player: LobbyPlayer = this.players[this.players.length - 1]!;
		return player;
	}
	
	public removePlayer(privateId: string): void {
		const i = this.players.findIndex(player => player.privateId === privateId);
		this.players.splice(i, 1);
	}
	
	public createGame(): Game {
		return new Game(this.title);
	}
	
	public toJson(): LobbyJson {
		return {
			title: this.title,
			host: this.host.publicId,
			players: this.players.map(player => player.toJson())
		};
	}
	
	private generatePlayerIds() {
		return {
			privateId: uuid.v4(),
			publicId: uuid.v4()
		};
	}
	
	private generateColor(): string {
		// TODO
		return "#000000";
	}
}