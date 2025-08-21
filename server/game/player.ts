import { type GamePlayer, type GameSpectator } from "../../shared/game/game.js";
import { type PrivateId, type PublicId } from "../../shared/player.js";
import { type Rgb } from "../../shared/rgb.js";


export type ParticipantParams = {
	name: string,
	publicId: string,
	privateId: string,
	// Initial chips, mostly for testing. Initial chips are 2 if not specified.
	chips?: number;
};


export type SpectatorParams = ParticipantParams;


// Constructor parameters for Player.
export type PlayerParams = ParticipantParams & {
	color: string
};


// Spectators can place bets, but cannot submit guesses.
export abstract class Participant {
	public readonly name: string;
	public readonly publicId: PublicId;
	public readonly privateId: PrivateId;
	
	public chips: number;
	
	constructor(player: ParticipantParams) {
		this.name = player.name;
		this.publicId = player.publicId;
		this.privateId = player.privateId;
		this.chips = player.chips ?? 2;
	}
}

export class Spectator extends Participant {
	constructor(player: SpectatorParams) {
		super(player);
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
export class Player extends Participant {
	public readonly color: Rgb;
	
	constructor(player: PlayerParams) {
		super(player);
		this.color = player.color;
	}
	
	public toJson(): GamePlayer {
		return {
			name: this.name,
			publicId: this.publicId,
			color: this.color,
			chips: this.chips
		};
	}
}
