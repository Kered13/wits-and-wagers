import * as uuid from "uuid";

import { Game } from "../game/game.js";
import { type PlayerParams, type SpectatorParams } from "../game/player.js";
import { QuestionGenerator } from "../questions/question-generator.js";
import { type QuestionSetManager } from "../questions/question-set-manager.js";
import { type GameId } from "../../shared/game/game.js";
import { type LobbyOptions } from "../../shared/lobby/create.js";
import { type LobbyPlayer, type LobbyState, type LobbyId, type LobbySpectator } from "../../shared/lobby/lobby.js";
import { type LobbyBeginGame, type LobbyCanceled, type LobbyUpdate } from "../../shared/lobby/notifications.js";
import { type PrivateId, type PrivatePlayer, type PublicId } from "../../shared/player.js";
import { HttpError } from "../utils/httperror.js";


class Spectator implements SpectatorParams {
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


class Player extends Spectator implements PlayerParams {
	// The color for the user. Unique within a lobby or game.
	public readonly color: string;
	
	constructor(player: PlayerParams) {
		super(player);
		this.color = player.color;
	}
	
	public override toJson(): LobbyPlayer {
		return {
			name: this.name,
			publicId: this.publicId,
			color: this.color,
		};
	}
	
	public override toPrivateJson(): PrivatePlayer {
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
	
	public addPlayer(name: string, existingId?: PrivateId): Player {
		const existingPlayer = this.players.find(player => player.privateId === existingId);
		const existingSpectator = this.spectators.find(player => player.privateId === existingId);
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
	
	public addSpectator(name: string, existingId?: PrivateId): Spectator {
		const existingSpectator = this.spectators.find(player => player.privateId === existingId);
		const existingPlayer = this.players.find(player => player.privateId === existingId);
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
	
	public removePlayer(privateId: PrivateId): void {
		this.removeParticipant(this.players, privateId);
	}
	
	public removeSpectator(privateId: PrivateId): void {
		this.removeParticipant(this.spectators, privateId);
	}
	
	private removeParticipant(players: Player[] | Spectator[], privateId: string): void {
		const i = players.findIndex(player => player.privateId === privateId);
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
		// TODO
		return "#000000";
	}
}
