import * as uuid from "uuid";

import { Game } from "../game/game.js";
import { type LobbyPlayerJson, type LobbyJson, type LobbyId } from "../../shared/lobby/lobby.js";
import type { PrivateId, PrivatePlayer } from "../../shared/player.js";
import type { Serializable } from "../utils/serializable.js";
import type { LobbyBeginGame, LobbyCanceled, LobbyUpdate } from "../../shared/lobby/notifications.js";


export class LobbyPlayer implements Serializable<LobbyPlayerJson> {
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
			name: this.name,
			publicId: this.publicId,
			color: this.color
		};
	}
	
	public toPrivateJson(): PrivatePlayer {
		return {
			name: this.name,
			publicId: this.publicId,
			privateId: this.privateId
		};
	}
};


export class Lobby implements Serializable<LobbyJson> {
	private readonly players: LobbyPlayer[] = [];
	private readonly host: LobbyPlayer;
	
	constructor(
			private readonly id: LobbyId,
			private readonly title: string,
			hostName: string) {
		this.host = this.addPlayer(hostName);
	}
	
	public getId(): LobbyId {
		return this.id;
	}

	public isHost(requester: PrivateId): boolean {
		return requester === this.host.privateId;
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
	
	public beginGame(): Game {
		return new Game(this.id, this.title, this.players);
	}
	
	public toJson(): LobbyJson {
		return {
			title: this.title,
			host: this.host.publicId,
			players: this.players.map(player => player.toJson())
		};
	}
	
	public makeUpdate(): LobbyUpdate {
		return {
			type: "update",
			id: this.id,
			state: this.toJson()
		};
	}
	
	public makeBeginGame(): LobbyBeginGame {
		return {
			type: "begin-game",
			id: this.id,
			gameId: this.id
		};
	}
	
	public makeCancel(): LobbyCanceled {
		return {
			type: "canceled",
			id: this.id,
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