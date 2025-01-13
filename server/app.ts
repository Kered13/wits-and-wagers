import cors from "cors";
import express, { type Request, type Response } from "express";
import expressWs from "express-ws";
import { is } from "valibot";
import type { WebSocket } from "ws";

import { Game } from "./game/game.js";
import { CreateGameRequestSchema, type CreateGameResponse } from "../shared/game/create.interface.js";
import { GameIdSchema, type GameId, type GameState } from "../shared/game/game.interface.js";
import { HttpError } from "./utils/httperror.js"


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
	private readonly clients: Set<WebSocket>;

	constructor(public readonly id: Id, public readonly obj: T) {
		this.clients = new Set();
	}
	
	public addClient(clientWs: WebSocket): void {
		this.clients.add(clientWs);
	}
	
	public removeClient(clientWs: WebSocket): void {
		this.clients.delete(clientWs);
	}
	
	public notifyClients(): void {
		const update: ObjUpdate<State, Id> = {
			type: "update",
			id: this.id,
			state: this.obj.getJson()
		};
		const json = JSON.stringify(update);
		
		this.clients.forEach(clientWs => {
			clientWs.send(json);
		});
	}
};

class GameNotifier extends Notifier<GameState, Game, GameId> {}


const games: Map<GameId, GameNotifier> = new Map();
const gameNotifier = new GameNotifier("game0", new Game("Test Game"));
games.set(gameNotifier.id, gameNotifier);


app.post("/api/create", (req: Request, res: Response) => {
	console.log("POST /api/create " + JSON.stringify(req.body));
	if (!is(CreateGameRequestSchema, req.body)) {
		throw new HttpError(400, `Invalid CreateGameRequest: ${req.body}`);
	}
	
	const gameNotifier = new GameNotifier("game" + games.size, new Game(req.body.title));
	games.set(gameNotifier.id, gameNotifier);
	
	const response: CreateGameResponse = { id: gameNotifier.id };
	res.send(response);
});

app.post("/api/addone", (req: Request, res: Response) => {
	console.log("GET /api/addone " + JSON.stringify(req.body));
	
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

app.post("/api/reset", (req: Request, res: Response) => {
	console.log("GET /api/reset " + JSON.stringify(req.body));
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

app.get("/api/state", (req: Request, res: Response) => {
	console.log("GET /api/state " + JSON.stringify(req.query));
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

app.ws("/api/state", (ws: WebSocket) => {
	ws.on("message", (msg: string) => {
		const gameId: string = JSON.parse(msg);
		console.log("WS /api/state " + gameId);

		const game = games.get(gameId);
		if (game) {
			ws.on("close", () => {
				game.removeClient(ws);
			});
			game.addClient(ws);
		}
	});
});

const port = 3000;

app.listen(port, () => {
	console.log("Server is running on port " + port);
});
