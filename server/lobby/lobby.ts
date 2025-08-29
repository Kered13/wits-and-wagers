import * as uuid from "uuid";

import { Game } from "../game/game.js";
import { type PlayerParams, type SpectatorParams } from "../game/player.js";
import { QuestionGenerator } from "../questions/question-generator.js";
import { type QuestionSetManager } from "../questions/question-set-manager.js";
import { HttpError } from "../utils/httperror.js";
import { COLORS } from "../../shared/color.js";
import { type GameId } from "../../shared/game/game.js";
import { type LobbyOptions } from "../../shared/lobby/create.js";
import { type LobbyPlayer, type LobbyState, type LobbyId, type LobbySpectator } from "../../shared/lobby/lobby.js";
import { type LobbyBeginGame, type LobbyCanceled, type LobbyUpdate } from "../../shared/lobby/notifications.js";
import { type PrivateId, type PrivatePlayer, type PublicId } from "../../shared/player.js";
import { type Rgb } from "../../shared/rgb.js";


export abstract class Participant {
	// Display name for the user. Not unique.
	public readonly name: string;
	// An ID used to uniquely identify the user.
	public readonly publicId: PublicId;
	// An ID used to authenticate the user in RPCs.
	public readonly privateId: PrivateId;
	
	constructor(player: SpectatorParams) {
		this.name = player.name;
		this.publicId = player.publicId;
		this.privateId = player.privateId;
	}
}


class Spectator extends Participant implements SpectatorParams {
	constructor(player: SpectatorParams) {
		super(player);
	}
	
	public toJson(): LobbySpectator {
		return {
			name: this.name,
			publicId: this.publicId,
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


class Player extends Participant implements PlayerParams {
	// The color for the user. Unique within a lobby or game.
	public color: string;
	
	constructor(player: PlayerParams) {
		super(player);
		this.color = player.color;
	}
	
	public toJson(): LobbyPlayer {
		return {
			name: this.name,
			publicId: this.publicId,
			color: this.color,
		};
	}
	
	public toPrivateJson(): PrivatePlayer {
		return {
			name: this.name,
			publicId: this.publicId,
			privateId: this.privateId,
		};
	}
};


export class Lobby {
	private readonly players: Player[] = [];
	private readonly spectators: Spectator[] = [];
	private readonly host: PrivatePlayer;
	
	public static gameIdFromLobbyId(lobbyId: LobbyId): GameId {
		return lobbyId;
	}
	
	constructor(
			private readonly id: LobbyId,
			private readonly spectatorId: LobbyId,
			private readonly title: string,
			hostName: string,
			private readonly questionSet: number,
			private readonly options: LobbyOptions,
			private readonly questionSetManager: QuestionSetManager) {
		const hostPlayer = this.generatePlayer(hostName);
		this.players.push(hostPlayer);
		this.host = {
			name: hostPlayer.name,
			publicId: hostPlayer.publicId,
			privateId: hostPlayer.privateId
		};
		this.options.numberOfPlayers = this.options.numberOfPlayers ?? 7;
		
		Lobby.validateOptions(this.options);
	}
	
	static validateOptions(options: LobbyOptions): void {
		if (options.numberOfPlayers && (options.numberOfPlayers < 1 || options.numberOfPlayers > 7)) {
			throw new HttpError(400, "Number of players must be between 1 and 7.");
		}
		if (options.numberOfRounds && (options.numberOfRounds < 1)) {
			throw new HttpError(400, "Number of rounds must be greater than 0.");
		}
		if (options.questionPhaseDuration && (options.questionPhaseDuration <= 0)) {
			throw new HttpError(400, "Question phase duration must be greater than 0.");
		}
		if (options.bettingPhaseDuration && (options.bettingPhaseDuration <= 0)) {
			throw new HttpError(400, "Question phase duration must be greater than 0.");
		}
	}
	
	public getId(): LobbyId {
		return this.id;
	}
	
	public getSpectatorId(): LobbyId {
		return this.spectatorId;
	}
	
	public isHost(requester: PrivateId): boolean {
		return requester === this.host.privateId;
	}
	
	public getHost(): PrivatePlayer {
		return this.host;
	}
	
	public hasParticipant(id: PrivateId | PublicId): boolean {
		return !!(this.players.find(player => player.privateId === id || player.publicId === id) ||
			this.spectators.find(spectator => spectator.privateId === id || spectator.publicId === id));
	}
	
	public getPlayer(id: PrivateId | PublicId): Player {
		const player = this.players.find(player => player.privateId === id || player.publicId === id);
		if (!player) {
			throw new HttpError(404, `Player with public or private ID ${id} not found.`);
		}
		return player;
	}
	
	public getParticipant(id: PrivateId | PublicId): Participant {
		const player = this.players.find(player => player.privateId === id || player.publicId === id) ||
			this.spectators.find(spectator => spectator.privateId === id || spectator.publicId === id);
		if (!player) {
			throw new HttpError(404, `Player with public or private ID ${id} not found.`);
		}
		return player;
	}
	
	public addPlayer(name: string, existingId?: PrivateId | PublicId): Player {
		const existingPlayer = this.players.find(player => player.privateId === existingId || player.publicId === existingId);
		const existingSpectator = this.spectators.find(player => player.privateId === existingId || player.publicId === existingId);
		if (existingPlayer) {
			return existingPlayer;
		} else if (this.players.length >= this.options.numberOfPlayers!) {
			throw new HttpError(403, "Lobby is full.");
		} else if (existingSpectator) {
			// Move spectator to player.
			this.removeSpectator(existingSpectator.privateId);
			const player = this.playerFromSpectator(existingSpectator);
			this.players.push(player);
			return player;
		} else {
			const player = this.generatePlayer(name);
			this.players.push(player);
			return player;
		}
	}
	
	public addSpectator(name: string, existingId?: PrivateId | PublicId): Spectator {
		const existingSpectator = this.spectators.find(player => player.privateId === existingId || player.publicId === existingId);
		const existingPlayer = this.players.find(player => player.privateId === existingId || player.publicId === existingId);
		if (existingSpectator) {
			return existingSpectator;
		} else if (existingPlayer) {
			// Move spectator to player.
			this.removePlayer(existingPlayer.privateId);
			const spectator = this.spectatorFromPlayer(existingPlayer);
			this.spectators.push(spectator);
			return spectator;
		} else {
			const spectator = this.generateSpectator(name);
			this.spectators.push(spectator);
			return spectator;
		}
	}
	
	public removePlayer(id: PrivateId | PublicId): void {
		this.doRemoveParticipant(this.players, id);
	}
	
	public removeSpectator(id: PrivateId | PublicId): void {
		this.doRemoveParticipant(this.spectators, id);
	}
	
	public setPlayerColor(playerId: PrivateId | PublicId, color: Rgb): void {
		if (!COLORS.includes(color)) {
			throw new HttpError(400, `Color ${color} is not a valid color.`);
		}
		
		const player = this.getPlayer(playerId);
		if (this.players.some(other => other.color === color && player !== other)) {
			throw new HttpError(400, `Color ${color} is already taken.`);
		}
		
		player.color = color;
	}
	
	// Remove either a player or a spectator.
	public removeParticipant(id: PrivateId | PublicId): void {
		const playerIdx = this.players.findIndex(player => player.privateId === id || player.publicId === id);
		const spectatorIdx = this.spectators.findIndex(player => player.privateId === id || player.publicId === id);
		if (playerIdx >= 0) {
			this.players.splice(playerIdx, 1);
		} else if (spectatorIdx >= 0) {
			this.spectators.splice(spectatorIdx, 1);
		} else {
			throw new HttpError(404, `Player with public or private ID ${id} not found.`);
		}
	}
	
	private doRemoveParticipant(players: Player[] | Spectator[], id: PrivateId | PublicId): void {
		const i = players.findIndex(player => player.privateId === id || player.publicId === id);
		if (i < 0) {
			throw new HttpError(404, `Player with public or private ID ${id} not found.`);
		}
		players.splice(i, 1);
	}
	
	public beginGame(): [Game, LobbyBeginGame] {
		const game = new Game(
			Lobby.gameIdFromLobbyId(this.id),
			this.title,
			this.host,
			this.players,
			this.spectators,
			new QuestionGenerator(this.questionSetManager.getQuestionSet(this.questionSet)!.questions),
			this.options);
		return [game, this.makeBeginGame(game.getId())];
	}
	
	public toJson(): LobbyState {
		return {
			title: this.title,
			host: this.host.publicId,
			players: this.players.map(player => player.toJson()),
			spectators: this.spectators.map(spectator => spectator.toJson()),
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
		return new Player({
			name: name,
			publicId: publicId,
			privateId: privateId,
			color: this.generateColor()
		});
	}
	
	private generateSpectator(name: string) {
		const { privateId, publicId } = this.generatePlayerIds();
		return new Spectator({
			name: name,
			publicId: publicId,
			privateId: privateId
		});
	}
	
	private playerFromSpectator(spectator: Spectator): Player {
		return new Player({
			name: spectator.name,
			publicId: spectator.publicId,
			privateId: spectator.privateId,
			color: this.generateColor()
		});
	}
	
	private spectatorFromPlayer(player: Player): Spectator {
		return new Spectator({
			name: player.name,
			publicId: player.publicId,
			privateId: player.privateId,
		});
	}
	
	private generatePlayerIds(): { privateId: PrivateId, publicId: PublicId } {
		return {
			privateId: uuid.v4(),
			publicId: uuid.v4()
		};
	}
	
	private generateColor(): string {
		const usedColors = this.players.map(player => player.color);
		const availableColors = COLORS.filter(color => !usedColors.includes(color));
		
		if (availableColors.length === 0) {
			throw new HttpError(500, "No colors available. This is a server bug.");
		}
		return availableColors[0]!;
	}
}
