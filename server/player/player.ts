import * as uuid from "uuid";

import { privateId, publicId } from "./player-id.js";
import { type Color } from "../../shared/color.js";
import { type GamePlayer, type GameSpectator } from "../../shared/game/game.js";
import { type LobbyPlayer, type LobbySpectator } from "../../shared/lobby/lobby.js";
import { type PrivateId, type PrivatePlayer, type PublicId } from "../../shared/player.js";


export type ParticipantParams = {
	name: string,
	publicId: PublicId,
	privateId: PrivateId,
	// Initial chips, mostly for testing. Initial chips are 2 if not specified.
	chips?: number;
};


export type SpectatorParams = ParticipantParams;


// Constructor parameters for Player.
export type PlayerParams = ParticipantParams & {
	color: Color
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
	
	public static generateParams(name: string): ParticipantParams {
		const { privateId, publicId } = this.generatePlayerIds();
		return {
			name: name,
			publicId: publicId,
			privateId: privateId
		};
	}
	
	private static generatePlayerIds(): { privateId: PrivateId, publicId: PublicId } {
		return {
			privateId: privateId(uuid.v4()),
			publicId: publicId(uuid.v4()),
		};
	}
	
	public toLobbyJson(): LobbyPlayer | LobbySpectator {
		return {
			name: this.name,
			publicId: this.publicId,
		};
	}
	
	public toGameJson(): GamePlayer | GameSpectator {
		return {
			...this.toLobbyJson(),
			chips: this.chips
		};
	}
	
	public toPrivateJson(): PrivatePlayer {
		return {
			name: this.name,
			publicId: this.publicId,
			privateId: this.privateId
		};
	}
}


export class Spectator extends Participant {
	constructor(player: SpectatorParams) {
		super(player);
	}
	
	static generate(name: string): Spectator {
		return new Spectator(Participant.generateParams(name));
	}
	
	static fromPlayer(player: Player): Spectator {
		return new Spectator({
			name: player.name,
			publicId: player.publicId,
			privateId: player.privateId,
		});
	}
}


// Players are like Spectators but can submit guesses. They also have a color
// assigned to them for UI purposes.
export class Player extends Participant {
	public color: Color;
	
	constructor(player: PlayerParams) {
		super(player);
		this.color = player.color;
	}
	
	static generate(name: string, color: Color): Player {
		return new Player({
			...Participant.generateParams(name),
			color: color,
		});
	}
	
	static fromSpectator(spectator: Spectator, color: Color): Player {
		return new Player({
			name: spectator.name,
			publicId: spectator.publicId,
			privateId: spectator.privateId,
			color: color,
		});
	}
	
	public override toLobbyJson(): LobbyPlayer {
		return {
			...super.toLobbyJson(),
			color: this.color,
		};
	}
	
	public override toGameJson(): GamePlayer {
		return {
			...this.toLobbyJson(),
			chips: this.chips,
		};
	}
}
