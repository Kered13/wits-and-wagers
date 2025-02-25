import * as uuid from "uuid";

import { Game } from "../game/game.js";
import { type PlayerParams } from "../game/player.js";
import { type GameId } from "../../shared/game/game.js";
import { type LobbyPlayer, type LobbyState, type LobbyId } from "../../shared/lobby/lobby.js";
import { type LobbyBeginGame, type LobbyCanceled, type LobbyUpdate } from "../../shared/lobby/notifications.js";
import { type PrivateId, type PrivatePlayer, type PublicId } from "../../shared/player.js";


export class Player implements PlayerParams {
	// Display name for the user. Not unique.
	public readonly name: string;
	// An ID used to uniquely identify the user.
	public readonly publicId: PublicId;
	// An ID used to authenticate the user in RPCs.
	public readonly privateId: PrivateId;
	// The color for the user. Unique within a lobby or game.
	public readonly color: string;
	
	constructor(player: PlayerParams) {
		this.name = player.name;
		this.publicId = player.publicId;
		this.privateId = player.privateId;
		this.color = player.color;
	}
	
	public toJson(): LobbyPlayer {
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


export class Lobby {
	private readonly players: Player[] = [];
	private readonly host: Player;
	
	public static gameIdFromLobbyId(lobbyId: LobbyId): GameId {
		return lobbyId;
	}
	
	constructor(
			private readonly id: LobbyId,
			private readonly title: string,
			hostName: string) {
		this.host = this.generatePlayer(hostName);
	}
	
	public getId(): LobbyId {
		return this.id;
	}

	public isHost(requester: PrivateId): boolean {
		return requester === this.host.privateId;
	}
	
	public getHost(): Player {
		return this.host;
	}
	
	public addPlayer(name: string, existingId?: PrivateId): Player {
		return this.players.find(player => player.privateId === existingId)
			|| this.generatePlayer(name);
	}
	
	public removePlayer(privateId: string): void {
		const i = this.players.findIndex(player => player.privateId === privateId);
		this.players.splice(i, 1);
	}
	
	public beginGame(): [Game, LobbyBeginGame] {
		const game = new Game(Lobby.gameIdFromLobbyId(this.id), this.title, this.host, this.players);
		return [game, this.makeBeginGame(game.getId())];
	}
	
	public toJson(): LobbyState {
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
	
	private makeBeginGame(gameId: GameId): LobbyBeginGame {
		return {
			type: "begin-game",
			id: this.id,
			gameId: gameId
		};
	}
	
	public makeCancel(): LobbyCanceled {
		return {
			type: "canceled",
			id: this.id,
		};
	}

	private generatePlayer(name: string): Player {
		const { privateId, publicId } = this.generatePlayerIds();
		this.players.push(new Player({
			name: name,
			publicId: publicId,
			privateId: privateId,
			color: this.generateColor()
		}));
		const player: Player = this.players[this.players.length - 1]!;
		return player;
	}
	
	private generatePlayerIds(): { privateId: PrivateId, publicId: PublicId } {
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
