import cors from "cors";
import express, { type Request, type Response } from "express";
import expressWs from "express-ws";
import { is } from "valibot";
import type { WebSocket } from "ws";

import { Game } from "./game/game.js";
import { Lobby } from "./lobby/lobby.js";
import { CreateGameRequestSchema, type CreateGameResponse } from "../shared/game/create.interface.js";
import { GameIdSchema, type GameId, type GameState } from "../shared/game/game.interface.js";
import { LobbyIdSchema, type LobbyId, type LobbyState } from "../shared/lobby/lobby.interface.js";
import { AddPlayerRequestSchema, } from "../shared/lobby/addplayer.interface.js";
import { CreateLobbyRequestSchema, type CreateLobbyResponse } from "../shared/lobby/create.interface.js";
import { HttpError } from "./utils/httperror.js"
import { WebSocketUtil } from "./utils/websocket.js";


const app: expressWs.Application = expressWs(express()).app;

app.use(cors());
app.use(express.json({ strict: false }));
app.use(express.static("public"));


interface Obj<State> {
	getJson(): State;
};

interface ObjUpdate<State, Id> {
	type: "update";
	id: Id;
	state: State;
}


class Notifier<State, T extends Obj<State>, Id> {
	private readonly clients: Set<WebSocketUtil>;

	constructor(public readonly id: Id, public readonly obj: T) {
		this.clients = new Set();
	}
	
	public addClient(clientWs: WebSocketUtil): void {
		this.clients.add(clientWs);
	}
	
	public removeClient(clientWs: WebSocketUtil): void {
		this.clients.delete(clientWs);
	}
	
	public notifyClients(): void {
		const update: ObjUpdate<State, Id> = {
			type: "update",
			id: this.id,
			state: this.obj.getJson()
		};
		this.clients.forEach(clientWs => {
			clientWs.send(update);
		});
	}
};

class GameNotifier extends Notifier<GameState, Game, GameId> {}
class LobbyNotifier extends Notifier<LobbyState, Lobby, LobbyId> {}


const games: Map<GameId, GameNotifier> = new Map();
const gameNotifier = new GameNotifier("game0", new Game("Test Game"));
games.set(gameNotifier.id, gameNotifier);

const lobbies: Map<LobbyId, LobbyNotifier> = new Map();


app.post("/api/lobby/create", (req: Request, res: Response) => {
	console.log("POST /api/lobby/create " + JSON.stringify(req.body));
	
	if (!is(CreateLobbyRequestSchema, req.body)) {
		throw new HttpError(400, `Invalid CreateLobbyRequest: ${req.body}`);
	}
	
	const lobbyNotifier = new LobbyNotifier("game" + games.size, new Lobby(req.body.title, "Leeroy"));
	lobbies.set(lobbyNotifier.id, lobbyNotifier);
	
	const response: CreateLobbyResponse = { id: lobbyNotifier.id };
	res.send(response);
});

app.post("/api/lobby/addplayer", (req: Request, res: Response) => {
	console.log("GET /api/lobby/addplayer " + JSON.stringify(req.body));
	
	if (!is(AddPlayerRequestSchema, req.body)) {
		throw new HttpError(400, `Invalid AddPlayerRequest: ${req.body}`);
	}
	
	const lobbyNotifier = lobbies.get(req.body.lobbyId);
	if (!lobbyNotifier) {
		throw new HttpError(404, `LobbyId ${req.body.lobbyId} not found.`);
	}
	
	lobbyNotifier.obj.addPlayer(req.body.name);
	res.end();
	lobbyNotifier.notifyClients();
});

app.ws("/api/lobby/state", (webSocket: WebSocket) => {
	const ws = new WebSocketUtil(webSocket);
	ws.onMethod("register", (msg: unknown) => {
		console.log("WS /api/lobby/state " + JSON.stringify(msg));
		
		if (!is(LobbyIdSchema, msg)) {
			throw new HttpError(400, `${msg} is not a valid GameId.`);
		}
		
		const lobbyId: LobbyId = msg;
		const lobby = lobbies.get(lobbyId);
		if (!lobby) {
			throw new HttpError(404, `LobbyId ${lobbyId} not found.`);
		}
		ws.onClose(() => {
			lobby.removeClient(ws);
		});
		lobby.addClient(ws);
	});
});


app.post("/api/game/create", (req: Request, res: Response) => {
	console.log("POST /api/game/create " + JSON.stringify(req.body));
	if (!is(CreateGameRequestSchema, req.body)) {
		throw new HttpError(400, `Invalid CreateGameRequest: ${req.body}`);
	}
	
	const gameNotifier = new GameNotifier("game" + games.size, new Game(req.body.title));
	games.set(gameNotifier.id, gameNotifier);
	
	const response: CreateGameResponse = { id: gameNotifier.id };
	res.send(response);
});

app.post("/api/game/addone", (req: Request, res: Response) => {
	console.log("GET /api/game/addone " + JSON.stringify(req.body));
	
	if (!is(GameIdSchema, req.body)) {
		throw new HttpError(400, `req.body} is not a valid GameId.`);
	}
	
	const gameNotifier = games.get(req.body);
	if (!gameNotifier) {
		throw new HttpError(404, `GameId ${req.body} not found.`);
	}
	
	gameNotifier.obj.addOne();
	res.end();
	gameNotifier.notifyClients();
});

app.post("/api/game/reset", (req: Request, res: Response) => {
	console.log("GET /api/game/reset " + JSON.stringify(req.body));
	if (!is(GameIdSchema, req.body)) {
		throw new HttpError(400, `req.body} is not a valid GameId.`);
	}
	
	const gameNotifier = games.get(req.body);
	if (!gameNotifier) {
		throw new HttpError(404, `GameId ${req.body} not found.`);
	}
	
	gameNotifier.obj.resetCounter();
	res.end();
	gameNotifier.notifyClients();
});

app.get("/api/game/state", (req: Request, res: Response) => {
	console.log("GET /api/game/state " + JSON.stringify(req.query));

	if (!req.query.id) {
		throw new HttpError(400, `id= must be provided.`);
	}
	if (!is(GameIdSchema, req.query.id)) {
		throw new HttpError(400, `${req.query.id} is not a valid GameId.`);
	}
	
	const gameNotifier = games.get(req.query.id);
	if (!gameNotifier) {
		throw new HttpError(404, `GameId ${req.body.id} not found.`);
	}
	
	res.json(gameNotifier.obj.getJson());
});

app.ws("/api/game/state", (webSocket: WebSocket) => {
	const ws = new WebSocketUtil(webSocket);
	ws.onMethod("register", (msg: unknown) => {
		console.log("WS /api/game/state " + JSON.stringify(msg));
		
		if (!is(GameIdSchema, msg)) {
			throw new HttpError(400, `${msg} is not a valid GameId.`);
		}
		
		const gameId: GameId = msg;
		const game = games.get(gameId);
		if (!game) {
			throw new HttpError(404, `GameId ${gameId} not found.`);
		}
		ws.onClose(() => {
			game.removeClient(ws);
		});
		game.addClient(ws);
	});
});

const port = 3000;

app.listen(port, () => {
	console.log("Server is running on port " + port);
});
