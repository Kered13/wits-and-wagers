import * as uuid from "uuid";
import { assert } from "valibot";

import { Game } from "../game/game.js";
import { PlayerSchema, type LobbyState } from "../../shared/lobby/lobby.interface.js";


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
};


export class Lobby {
	private readonly players: LobbyPlayer[] = [];
	// Public ID of the host for this lobby.
	private readonly host: string;
	
	constructor(
		private readonly title: string,
		hostName: string) {
			this.host = this.addPlayer(hostName).publicId;
		}
	
	public addPlayer(name: string): LobbyPlayer {
		const { privateId, publicId } = this.generatePlayerIds();
		this.players.push({
			privateId: privateId,
			publicId: publicId,
			name: name,
			color: this.generateColor()
		});
		const player: LobbyPlayer = this.players[this.players.length - 1]!;
		assert(PlayerSchema, player);
		return player;
	}
	
	public removePlayer(privateId: string): void {
		const i = this.players.findIndex(player => player.privateId === privateId);
		this.players.splice(i, 1);
	}
	
	public createGame(): Game {
		return new Game(this.title);
	}
	
	public getJson(): LobbyState {
		return {
			title: this.title,
			host: this.host,
			players: this.players.map(player => ({
				publicId: player.publicId,
				name: player.name,
				color: player.color
			}))
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