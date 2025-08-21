import { HttpError } from "../utils/httperror.js";
import { type GamePlayer, type GameSpectator } from "../../shared/game/game.js";
import { type PrivateId, type PublicId } from "../../shared/player.js";
import { type Rgb } from "../../shared/rgb.js";


export type SpectatorParams = {
	name: string,
	publicId: string,
	privateId: string,
	chips?: number
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
		if (player.chips !== undefined) {
			this.chips = player.chips;
		}
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
