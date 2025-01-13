import { assert } from "valibot";

import { Game } from "../game/game.js";
import { PlayerSchema, type LobbyState, type Player } from "../../shared/lobby/lobby.interface.js";


export class Lobby {
	private readonly players: Player[] = [];
	
	constructor(
		public readonly title: string,
		public readonly host: string) {
			this.addPlayer(host);
		}
	
	public addPlayer(name: string): Player {
		this.players.push({
			id: this.generatePlayerId(),
			name: name,
			color: this.generateColor()
		});
		const player: Player = this.players[this.players.length - 1]!;
		assert(PlayerSchema, player);
		return player;
	}
	
	public removePlayer(id: string): void {
		const i = this.players.findIndex(player => player.id === id);
		this.players.splice(i, 1);
	}
	
	public createGame(): Game {
		return new Game(this.title);
	}
	
	public getJson(): LobbyState {
		return {
			title: this.title,
			host: this.host,
			players: this.players
		};
	}
	
	private generatePlayerId(): string {
		// TODO
		return this.players.length.toString();
	}
	
	private generateColor(): string {
		// TODO
		return "#000000";
	}
}