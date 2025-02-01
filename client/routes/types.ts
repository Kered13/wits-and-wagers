import { GameId } from "../../shared/game/game";
import { LobbyId } from "../../shared/lobby/lobby";
import { PrivatePlayer } from "../../shared/player";


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
