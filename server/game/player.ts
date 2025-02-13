import { type LobbyPlayer } from "../lobby/lobby.js";
import { HttpError } from "../utils/httperror.js";
import { type GamePlayerJson } from "../../shared/game/game.js";
import { type PrivateId, type PublicId } from "../../shared/player.js";
import { type Rgb } from "../../shared/rgb.js";


export class Player {
	public readonly name: string;
	public readonly publicId: PublicId;
	public readonly privateId: PrivateId;
	public readonly color: Rgb;
	
	public chips: number = 0;
	
	constructor(lobbyPlayer: LobbyPlayer) {
		this.name = lobbyPlayer.name;
		this.publicId = lobbyPlayer.publicId;
		this.privateId = lobbyPlayer.privateId;
		this.color = lobbyPlayer.color;
	}
	
	public toJson(): GamePlayerJson {
		return {
			name: this.name,
			publicId: this.publicId,
			color: this.color,
			chips: this.chips
		};
	}
}

export class PlayerManager {
	constructor(private readonly players: Player[]) {}
	
	public hasPrivatePlayer(id: PrivateId): boolean {
		return !!this.tryGetPrivatePlayer(id);
	}
	
	public hasPublicPlayer(id: PrivateId): boolean {
		return !!this.tryGetPublicPlayer(id);
	}
	
	public getPrivatePlayer(id: PrivateId): Player {
		const player = this.tryGetPrivatePlayer(id);
		if (!player) {
			throw new HttpError(404, `Player private ID ${id} not found.`);
		}
		return player;
	}
	
	public getPublicPlayer(id: PublicId): Player {
		const player = this.tryGetPublicPlayer(id);
		if (!player) {
			throw new HttpError(404, `Player public ID ${id} not found.`);
		}
		return player;
	}
	
	private tryGetPrivatePlayer(id: PrivateId): Player | undefined {
		return this.players.find(player => player.privateId === id);
	}
	
	private tryGetPublicPlayer(id: PublicId): Player | undefined {
		return this.players.find(player => player.publicId === id);
	}
	
	public getAll(): Player[] {
		return this.players;
	}
	
	public toJson(): GamePlayerJson[] {
		return this.players.map(player => player.toJson());
	}
	
	public rankPlayers(): GamePlayerJson[] {
		return this.players
			.sort((first, second) => second.chips - first.chips)
			.map(player => player.toJson());
	}
}
