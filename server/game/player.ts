import { HttpError } from "../utils/httperror.js";
import { type GamePlayer, type GameSpectator } from "../../shared/game/game.js";
import { type PrivateId, type PublicId } from "../../shared/player.js";
import { type Rgb } from "../../shared/rgb.js";


export type SpectatorParams = {
	name: string,
	publicId: string,
	privateId: string,
};


// Constructor parameters for Player.
export type PlayerParams = SpectatorParams & {
	color: string
};


// Spectators can place bets, but cannot submit guesses.
export class Spectator {
	public readonly name: string;
	public readonly publicId: PublicId;
	public readonly privateId: PrivateId;
	
	public chips: number = 2;
	
	constructor(player: SpectatorParams) {
		this.name = player.name;
		this.publicId = player.publicId;
		this.privateId = player.privateId;
	}
	
	public toJson(): GameSpectator {
		return {
			name: this.name,
			publicId: this.publicId,
			chips: this.chips
		};
	}
}


// Players are like Spectators but can submit guesses. They also have a color
// assigned to them for UI purposes.
export class Player extends Spectator {
	public readonly color: Rgb;
	
	constructor(player: PlayerParams) {
		super(player);
		this.color = player.color;
	}
	
	public override toJson(): GamePlayer {
		return {
			name: this.name,
			publicId: this.publicId,
			color: this.color,
			chips: this.chips
		};
	}
}


export class PlayerManager {
	private readonly players: Player[];
	
	constructor(players: Player[] | PlayerParams[]) {
		this.players = players.map(player => player instanceof Player ? player : new Player(player));
	}
	
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
	
	// Returns players ranked by chips.
	public toJson(): GamePlayer[] {
		return this.players
			.sort((first, second) => second.chips - first.chips)
			.map(player => player.toJson());
	}
}
