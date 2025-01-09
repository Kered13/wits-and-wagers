import { GameId, GameState } from "./game.interface";


export type GameNotification = GameUpdate | GameEnd;

export type GameUpdate = {
	type: "update",
	id: GameId,
	state: GameState
};

// After sending a GameEnd notification, no other notifications may be sent for
// this game.
export type GameEnd = {
	type: "end",
	id: GameId
};