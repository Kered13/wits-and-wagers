import { type Participant } from "./player.js";
import { HttpError } from "../utils/httperror.js";
import { type PrivateId, type PublicId } from "../../shared/player.js";


export class PlayerManager<P extends Participant> {
	constructor(private readonly players: P[]) { }
	
	public hasPrivatePlayer(id: PrivateId): boolean {
		return !!this.tryGetPrivatePlayer(id);
	}
	
	public hasPublicPlayer(id: PublicId): boolean {
		return !!this.tryGetPublicPlayer(id);
	}
	
	public getPrivatePlayer(id: PrivateId): P {
		const player = this.tryGetPrivatePlayer(id);
		if (!player) {
			throw new HttpError(404, `Player private ID ${id} not found.`);
		}
		return player;
	}
	
	public getPublicPlayer(id: PublicId): P {
		const player = this.tryGetPublicPlayer(id);
		if (!player) {
			throw new HttpError(404, `Player public ID ${id} not found.`);
		}
		return player;
	}
	
	private tryGetPrivatePlayer(id: PrivateId): P | undefined {
		return this.players.find(player => player.privateId === id);
	}
	
	private tryGetPublicPlayer(id: PublicId): P | undefined {
		return this.players.find(player => player.publicId === id);
	}
	
	public getAll(): P[] {
		return this.players;
	}
	
	public sortedByChips(): P[] {
		return this.players
			.sort((first, second) => second.chips - first.chips)
	}
}
