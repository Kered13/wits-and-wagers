import { type LobbyPlayer } from "../lobby/lobby.js";
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
