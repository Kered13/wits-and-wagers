import { GameId } from "../../shared/game/game.js";
import { LobbyId } from "../../shared/lobby/lobby.js";
import { PrivatePlayer } from "../../shared/player.js";


export type HasUsername = {
	username: string;
};

export type HasPlayer = {
	player: PrivatePlayer,
};

export type HasLobbyId = {
	lobbyId: LobbyId;
};

export type HasGameId = {
	gameId: GameId;
};
