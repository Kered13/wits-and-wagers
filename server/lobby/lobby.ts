import { Subject, type Observable } from "rxjs";
import { parse } from "valibot";


import { type LobbyOptions } from "./lobby-option.js";
import { Game } from "../game/game.js";
import { type GameFactory } from "../game/game-factory.js";
import { type Participant, Player, Spectator } from "../player/player.js";
import { HttpError } from "../utils/httperror.js";
import { COLORS, type Color } from "../../shared/color.js";
import { GameIdSchema, type GameId } from "../../shared/game/game.js";
import { type LobbyState, type LobbyId } from "../../shared/lobby/lobby.js";
import { type LobbyBeginGame, type LobbyCanceled, type LobbyUpdate } from "../../shared/lobby/notifications.js";
import { type PrivateId, type PrivatePlayer, type PublicId } from "../../shared/player.js";


export class Lobby {
	private readonly players: Player[] = [];
	private readonly spectators: Spectator[] = [];
	private readonly updates = new Subject<void>();
	private readonly host: PrivatePlayer;
	
	public static gameIdFromLobbyId(lobbyId: LobbyId): GameId {
		return parse(GameIdSchema, lobbyId);
	}
	
	constructor(
			private readonly id: LobbyId,
			private readonly spectatorId: LobbyId,
			private readonly options: LobbyOptions,
			private readonly gameFactory: GameFactory) {
		const hostPlayer = Player.generate(this.options.host, this.generateColor());
		this.players.push(hostPlayer);
		this.host = {
			name: hostPlayer.name,
			publicId: hostPlayer.publicId,
			privateId: hostPlayer.privateId
		};
	}
	
	public getId(): LobbyId {
		return this.id;
	}
	
	public getSpectatorId(): LobbyId {
		return this.spectatorId;
	}
	
	public isHost(player: PrivateId | PublicId): boolean {
		return player === this.host.privateId || player === this.host.publicId;
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
	
	public getParticipants(): Participant[] {
		return [...this.players, ...this.spectators];
	}
	
	public addPlayer(name: string, existingId?: PrivateId | PublicId): Player {
		const existingPlayer = this.players.find(player => player.privateId === existingId || player.publicId === existingId);
		const existingSpectator = this.spectators.find(player => player.privateId === existingId || player.publicId === existingId);
		
		let player: Player;
		if (existingPlayer) {
			return existingPlayer;
		} else if (this.players.length >= this.options.numberOfPlayers) {
			throw new HttpError(403, "Lobby is full.");
		} else if (existingSpectator) {
			// Move spectator to player.
			this.removeSpectator(existingSpectator.privateId);
			player = Player.fromSpectator(existingSpectator, this.generateColor());
			this.players.push(player);
		} else {
			player = Player.generate(name, this.generateColor());
			this.players.push(player);
		}
		this.updates.next();
		return player;
	}
	
	public addSpectator(name: string, existingId?: PrivateId | PublicId): Spectator {
		const existingSpectator = this.spectators.find(spec => spec.privateId === existingId || spec.publicId === existingId);
		const existingPlayer = this.players.find(player => player.privateId === existingId || player.publicId === existingId);
		
		let spectator: Spectator;
		if (existingSpectator) {
			return existingSpectator;
		} else if (existingPlayer) {
			// Move spectator to player.
			this.removePlayer(existingPlayer.privateId);
			spectator = Spectator.fromPlayer(existingPlayer);
			this.spectators.push(spectator);
		} else {
			spectator = Spectator.generate(name);
			this.spectators.push(spectator);
		}
		this.updates.next();
		return spectator;
	}
	
	public removePlayer(id: PrivateId | PublicId): void {
		this.doRemoveParticipant(this.players, id);
	}
	
	public removeSpectator(id: PrivateId | PublicId): void {
		this.doRemoveParticipant(this.spectators, id);
	}
	
	public setPlayerColor(playerId: PrivateId | PublicId, color: Color): void {
		if (!COLORS.includes(color)) {
			throw new HttpError(400, `Color ${color} is not a valid color.`);
		}
		
		const player = this.getPlayer(playerId);
		if (this.players.some(other => other.color === color && player !== other)) {
			throw new HttpError(400, `Color ${color} is already taken.`);
		}
		
		player.color = color;
		this.updates.next();
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
		this.updates.next();
	}
	
	private doRemoveParticipant(players: Player[] | Spectator[], id: PrivateId | PublicId): void {
		const i = players.findIndex(player => player.privateId === id || player.publicId === id);
		if (i < 0) {
			throw new HttpError(404, `Player with public or private ID ${id} not found.`);
		}
		players.splice(i, 1);
	}
	
	public beginGame(): [Game, LobbyBeginGame] {
		const game = this.gameFactory.newGame(
			Lobby.gameIdFromLobbyId(this.id),
			Lobby.gameIdFromLobbyId(this.spectatorId),
			this.players,
			this.spectators,
			this.host,
			this.options.questionSet,
			this.options);
		return [game, this.makeBeginGame(game.getId())];
	}
	
	// End lobby update notifications. No changes to the lobby may be made after
	// calling this.
	public endLobby(): void {
		this.updates.complete();
	}
	
	public toJson(forPlayer: PrivateId): LobbyState {
		const hostInfo = forPlayer === this.getHost().privateId ? { lobbyId: this.id, spectatorId: this.spectatorId } : undefined;
		return {
			title: this.options.title,
			host: this.host.publicId,
			hostInformation: hostInfo,
			players: this.players.map(player => player.toLobbyJson()),
			spectators: this.spectators.map(spectator => spectator.toLobbyJson()),
		};
	}
	
	public makeUpdate(forPlayer: PrivateId): LobbyUpdate {
		return {
			type: "update",
			state: this.toJson(forPlayer)
		};
	}
	
	private makeBeginGame(gameId: GameId): LobbyBeginGame {
		return {
			type: "begin-game",
			gameId: gameId
		};
	}
	
	public makeCancel(): LobbyCanceled {
		return {
			type: "canceled",
		};
	}
	
	private generateColor(): Color {
		const usedColors = this.players.map(player => player.color);
		const availableColors = COLORS.filter(color => !usedColors.includes(color));
		
		if (availableColors.length === 0) {
			throw new HttpError(500, "No colors available. This is a server bug.");
		}
		return availableColors[0]!;
	}
	
	// Notifies when a new update is available. Subscribers should call
	// makeUpdate() to get the update. When this observable completes, the lobby
	// has ended.
	public onUpdates(): Observable<void> {
		return this.updates.asObservable();
	}
}
