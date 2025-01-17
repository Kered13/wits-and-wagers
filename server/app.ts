import cors from "cors";
import express, { type Request, type Response } from "express";
import expressWs from "express-ws";
import { assert, is } from "valibot";
import type { WebSocket } from "ws";

import { Game } from "./game/game.js";
import { Lobby } from "./lobby/lobby.js";
import { type CreateGameResponse } from "../shared/game/create.js";
import { GameIdSchema, type GameId, type GameJson } from "../shared/game/game.js";
import { LobbyIdSchema, type LobbyId, type LobbyJson } from "../shared/lobby/lobby.js";
import { AddPlayerRequestSchema, AddPlayerResponseSchema, type AddPlayerResponse, } from "../shared/lobby/addplayer.js";
import { CreateLobbyRequestSchema, CreateLobbyResponseSchema, type CreateLobbyResponse } from "../shared/lobby/create.js";
import { HttpError } from "./utils/httperror.js"
import { Notifier } from "./utils/notifier.js";
import { WebSocketUtil } from "./utils/websocket.js";


const app: expressWs.Application = expressWs(express()).app;

app.use(cors());
app.use(express.json({ strict: false }));
app.use(express.static("public"));


class GameNotifier extends Notifier<GameJson, Game, GameId> {}
class LobbyNotifier extends Notifier<LobbyJson, Lobby, LobbyId> {}


const games: Map<GameId, GameNotifier> = new Map();
const gameNotifier = new GameNotifier("game0", new Game("Test Game"));
games.set(gameNotifier.id, gameNotifier);

const lobbies: Map<LobbyId, LobbyNotifier> = new Map();


app.post("/api/lobby/create", (req: Request, res: Response) => {
	console.log("POST /api/lobby/create " + JSON.stringify(req.body));
	
	if (!is(CreateLobbyRequestSchema, req.body)) {
		throw new HttpError(400, `Invalid CreateLobbyRequest: ${req.body}`);
	}
	
	const lobbyNotifier = new LobbyNotifier("game" + lobbies.size, new Lobby(req.body.title, req.body.host));
	lobbies.set(lobbyNotifier.id, lobbyNotifier);
	
	const response: CreateLobbyResponse = {
		id: lobbyNotifier.id,
		host: lobbyNotifier.state.getHost().toPrivateJson()
	};
	assert(CreateLobbyResponseSchema, response);
	res.send(response);
});

app.post("/api/lobby/addplayer", (req: Request, res: Response) => {
	console.log("POST /api/lobby/addplayer " + JSON.stringify(req.body));
	
	if (!is(AddPlayerRequestSchema, req.body)) {
		throw new HttpError(400, `Invalid AddPlayerRequest: ${req.body}`);
	}
	
	const lobbyNotifier = lobbies.get(req.body.lobbyId);
	if (!lobbyNotifier) {
		throw new HttpError(404, `LobbyId ${req.body.lobbyId} not found.`);
	}
	
	const player = lobbyNotifier.state.addPlayer(req.body.name);
	
	const response: AddPlayerResponse = {
		player: player.toPrivateJson()
	};
	assert(AddPlayerResponseSchema, response);
	res.send(response);
	
	lobbyNotifier.notifyClients();
});

app.get("/api/lobby/state", (req: Request, res: Response) => {
	console.log("GET /api/lobby/state " + JSON.stringify(req.query));
	
	if (!req.query.id) {
		throw new HttpError(400, `id= must be provided.`);
	}
	if (!is(GameIdSchema, req.query.id)) {
		throw new HttpError(400, `${req.query.id} is not a valid LobbyId.`);
	}
	
	const lobbyNotifier = lobbies.get(req.query.id);
	if (!lobbyNotifier) {
		throw new HttpError(404, `LobbyId ${req.query.id} not found.`);
	}
	
	res.json(lobbyNotifier.state.toJson());
});

app.ws("/api/lobby/state", (webSocket: WebSocket) => {
	const ws = new WebSocketUtil(webSocket);
	ws.onMethod("register", (msg: unknown) => {
		console.log("WS /api/lobby/state " + JSON.stringify(msg));
		
		if (!is(LobbyIdSchema, msg)) {
			throw new HttpError(400, `${msg} is not a valid LobbyId.`);
		}
		
		const lobby = lobbies.get(msg);
		if (!lobby) {
			throw new HttpError(404, `LobbyId ${msg} not found.`);
		}
		ws.onClose(() => {
			lobby.removeClient(ws);
		});
		lobby.notifyClient(ws);
		lobby.addClient(ws);
	});
});


app.post("/api/game/create", (req: Request, res: Response) => {
	console.log("POST /api/game/create " + JSON.stringify(req.body));
	if (!is(LobbyIdSchema, req.body)) {
		throw new HttpError(400, `${req.body} is not a valid LobbyId.`);
	}
	
	const lobby = lobbies.get(req.body);
	if (!lobby) {
		throw new HttpError(404, `LobbyId ${req.body} not found.`);
	}
	
	const gameNotifier = new GameNotifier(lobby.id, lobby.state.createGame());
	games.set(gameNotifier.id, gameNotifier);
	lobbies.delete(lobby.id);
	
	const response: CreateGameResponse = { id: gameNotifier.id };
	res.send(response);
});

app.post("/api/game/addone", (req: Request, res: Response) => {
	console.log("POST /api/game/addone " + JSON.stringify(req.body));
	
	if (!is(GameIdSchema, req.body)) {
		throw new HttpError(400, `req.body} is not a valid GameId.`);
	}
	
	const gameNotifier = games.get(req.body);
	if (!gameNotifier) {
		throw new HttpError(404, `GameId ${req.body} not found.`);
	}
	
	gameNotifier.state.addOne();
	res.end();
	gameNotifier.notifyClients();
});

app.post("/api/game/reset", (req: Request, res: Response) => {
	console.log("POST /api/game/reset " + JSON.stringify(req.body));
	if (!is(GameIdSchema, req.body)) {
		throw new HttpError(400, `req.body} is not a valid GameId.`);
	}
	
	const gameNotifier = games.get(req.body);
	if (!gameNotifier) {
		throw new HttpError(404, `GameId ${req.body} not found.`);
	}
	
	gameNotifier.state.resetCounter();
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
		throw new HttpError(404, `GameId ${req.query.id} not found.`);
	}
	
	res.json(gameNotifier.state.toJson());
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
		game.notifyClient(ws);
		game.addClient(ws);
	});
});

const port = 3000;

app.listen(port, () => {
	console.log("Server is running on port " + port);
});
