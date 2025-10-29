import { type LobbyOptions } from "../../shared/lobby/create.js";
import { type LobbyId } from "../../shared/lobby/lobby.js";
import { type GameFactory } from "../game/game-factory.js";
import { Lobby } from "./lobby.js";


export class LobbyFactory {
	constructor(private readonly gameFactory: GameFactory) {}
	
	public newLobby(
			id: LobbyId,
			spectatorId: LobbyId,
			options: LobbyOptions): Lobby {
		return new Lobby(
			id,
			spectatorId,
			options,
			this.gameFactory)
	}
}
