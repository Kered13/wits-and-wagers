import { Player, Spectator, type Participant } from "./player.js";
import { HttpError } from "../utils/httperror.js";
import { type PrivateId, type PublicId } from "../../shared/player.js";


type KeyFn<T, K> = (p: T) => K;


function byPublicId<T extends Participant>(player: T): PublicId {
	return player.publicId;
}


function byPrivateId<T extends Participant>(player: T): PrivateId {
	return player.privateId;
}


function buildPlayerMap<T extends Participant, K>(players: T[], keyFn: KeyFn<T, K>): Map<K, T> {
	return new Map(players.map(player => [keyFn(player), player]));
}


function mapToArray<T extends Participant, K>(players: Map<K, T>): T[] {
	return Array.from(players).map(([id, player]) => player);
}


const PUBLIC = "public";
const PRIVATE = "private";
type IdKind = "public" | "private";

const PLAYER = "Player";
const SPECTATOR = "Spectator";
type PKind = "Player" | "Spectator";


export class PlayerManager {
	private readonly publicPlayers: Map<PublicId, Player>;
	private readonly privatePlayers: Map<PrivateId, Player>;
	private readonly publicSpectators: Map<PublicId, Spectator>;
	private readonly privateSpectators: Map<PrivateId, Spectator>;
	private readonly maps: {
		[PUBLIC]: {
			[PLAYER]: Map<PublicId, Player>,
			[SPECTATOR]: Map<PublicId, Spectator>,
		},
		[PRIVATE]: {
			[PLAYER]: Map<PublicId, Player>,
			[SPECTATOR]: Map<PublicId, Spectator>,
		},
	};
	
	constructor(players: Player[], spectators: Spectator[]) {
		this.publicPlayers = buildPlayerMap(players, byPublicId);
		this.privatePlayers = buildPlayerMap(players, byPrivateId);
		this.publicSpectators = buildPlayerMap(spectators, byPublicId);
		this.privateSpectators = buildPlayerMap(spectators, byPrivateId);
		
		this.maps = {
			[PUBLIC]: {
				[PLAYER]: this.publicPlayers,
				[SPECTATOR]: this.publicSpectators,
			},
			[PRIVATE]: {
				[PLAYER]: this.privatePlayers,
				[SPECTATOR]: this.privateSpectators,
			},
		};
	}
	
	private tryGet(a: typeof PUBLIC, b: typeof PLAYER, id: PublicId): Player | undefined;
	private tryGet(a: typeof PUBLIC, b: typeof SPECTATOR, id: PublicId): Spectator | undefined;
	private tryGet(a: typeof PRIVATE, b: typeof PLAYER, id: PrivateId): Player | undefined;
	private tryGet(a: typeof PRIVATE, b: typeof SPECTATOR, id: PrivateId): Spectator | undefined;
	private tryGet(a: IdKind, b: PKind, id: PublicId | PrivateId): Participant | undefined;
	private tryGet(a: IdKind, b: PKind, id: PublicId | PrivateId) {
		return this.maps[a][b].get(id);
	}

	private get(a: typeof PUBLIC, b: typeof PLAYER, id: PublicId): Player;
	private get(a: typeof PUBLIC, b: typeof SPECTATOR, id: PublicId): Spectator;
	private get(a: typeof PRIVATE, b: typeof PLAYER, id: PrivateId): Player;
	private get(a: typeof PRIVATE, b: typeof SPECTATOR, id: PrivateId): Spectator;
	private get(a: IdKind, b: PKind, id: PublicId | PrivateId): Participant;
	private get(a: IdKind, b: PKind, id: PublicId | PrivateId) {
		const player = this.maps[a][b].get(id);
		if (!player) {
			throw new HttpError(404, `${b} ${a} ID ${id} not found.`);
		}
		return player;
	}
	
	private getParticipant(a: typeof PUBLIC, id: PublicId): Participant;
	private getParticipant(a: typeof PRIVATE, id: PrivateId): Participant;
	private getParticipant(a: IdKind, id: PublicId | PrivateId): Participant {
		const player =
			this.tryGet(a, PLAYER, id) ??
			this.tryGet(a, SPECTATOR, id);
		if (!player) {
			throw new HttpError(404, `Player or spectator ${a} ID ${id} not found.`);
		}
		return player;
	}
	
	public tryGetPublicPlayer(id: PublicId): Player | undefined {
		return this.tryGet(PUBLIC, PLAYER, id);
	}
	
	public tryGetPublicSpectator(id: PublicId): Spectator | undefined {
		return this.tryGet(PUBLIC, SPECTATOR, id);
	}
	
	public tryGetPrivatePlayer(id: PrivateId): Player | undefined {
		return this.tryGet(PRIVATE, PLAYER, id);
	}
	
	public tryGetPrivateSpectator(id: PrivateId): Spectator | undefined {
		return this.tryGet(PRIVATE, SPECTATOR, id);
	}
	
	public getPublicPlayer(id: PublicId): Player {
		return this.get(PUBLIC, PLAYER, id);
	}
	
	public getPublicSpectator(id: PublicId): Spectator {
		return this.get(PUBLIC, SPECTATOR, id);
	}
	
	public getPrivatePlayer(id: PrivateId): Player {
		return this.get(PRIVATE, PLAYER, id);
	}
	
	public getPrivateSpectator(id: PrivateId): Spectator {
		return this.get(PRIVATE, SPECTATOR, id);
	}
	
	public getPublicParticipant(id: PublicId): Participant {
		return this.getParticipant(PUBLIC, id);
	}
	
	public getPrivateParticipant(id: PublicId): Participant {
		return this.getParticipant(PRIVATE, id);
	}
	
	public addPlayer(player: Player): void {
		this.maps[PUBLIC][PLAYER].set(player.publicId, player);
		this.maps[PRIVATE][PLAYER].set(player.privateId, player);
	}
	
	public addSpectator(spectator: Spectator): void {
		this.maps[PUBLIC][SPECTATOR].set(spectator.publicId, spectator);
		this.maps[PRIVATE][SPECTATOR].set(spectator.privateId, spectator);
	}
	
	public getAllPlayers(): Player[] {
		return mapToArray(this.publicPlayers);
	}
	
	public getAllSpectators(): Spectator[] {
		return mapToArray(this.publicSpectators);
	}
	
	public getAllParticipants(): Participant[] {
		return [...this.getAllPlayers(), ...this.getAllSpectators()];
	}
}
