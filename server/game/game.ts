import { type LobbyPlayer } from "../lobby/lobby.js";
import { HttpError } from "../utils/httperror.js";
import { type Serializable } from "../utils/serializable.js";
import { type GameId, type GameJson, type GamePlayerJson } from "../../shared/game/game.js";
import { type PrivateId, type PublicId } from "../../shared/player.js";
import { type Rgb } from "../../shared/rgb.js";
import type { GameUpdate } from "../../shared/game/notifications.js";


class GamePlayer implements Serializable<GamePlayerJson> {
	public readonly name: string;
	public readonly publicId: PublicId;
	public readonly privateId: PrivateId;
	public readonly color: Rgb;
	
	private counter: number = 0;
	
	constructor(lobbyPlayer: LobbyPlayer) {
		this.name = lobbyPlayer.name;
		this.publicId = lobbyPlayer.publicId;
		this.privateId = lobbyPlayer.privateId;
		this.color = lobbyPlayer.color;
	}
	
	public addOne(): void {
		this.counter++;
	}
	
	public reset(): void {
		this.counter = 0;
	}
	
	public toJson(): GamePlayerJson {
		return {
			name: this.name,
			publicId: this.publicId,
			color: this.color,
			counter: this.counter
		};
	}
}


export class Game implements Serializable<GameJson> {
	private readonly players: GamePlayer[];
	
	constructor(
			private readonly id: GameId,
			private readonly title: string,
			lobbyPlayers: LobbyPlayer[]) {
		this.players = lobbyPlayers.map(player => new GamePlayer(player));
	}
	
	public getId(): GameId {
		return this.id;
	}
	
	public addOne(id: PrivateId): void {
		this.getPlayer(id).addOne();
	}
	
	public resetCounter(id: PrivateId): void {
		this.getPlayer(id).reset();
	}
	
	public toJson(): GameJson {
		return {
			title: this.title,
			players: this.players.map(player => player.toJson())
		};
	}
	
	public makeUpdate(): GameUpdate {
		return {
			type: "update",
			id: this.id,
			state: this.toJson()
		};
	}
	
	private getPlayer(id: PrivateId): GamePlayer {
		const player = this.players.find(player => player.privateId === id);
		if (!player) {
			throw new HttpError(404, `Player private ID ${id} not found.`);
		}
		return player;
	}
}
