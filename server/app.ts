import cors from "cors";
import express, { type Request, type Response } from "express";
import expressWs from "express-ws";
import type { WebSocket } from "ws";

import { Game } from "./game/game.js";
import { type CreateGameRequest, type CreateGameResponse } from "../shared/game/create.interface.js";
import { type GameId } from "../shared/game/game.interface.js";
import { type GameUpdate } from "../shared/game/update.interface.js";


const expressApp: express.Application = express();
const app: expressWs.Application = expressWs(expressApp).app;

app.use(cors());
app.use(express.json({ strict: false }));
app.use(express.static("public"));


class GameServer {
	public readonly game: Game;
	
	private readonly clients: Set<WebSocket>;

	constructor(public readonly id: GameId, public readonly title: string) {
		this.game = new Game(title);
		this.clients = new Set();
	}
	
	public addClient(clientWs: WebSocket): void {
		this.clients.add(clientWs);
	}
	
	public removeClient(clientWs: WebSocket): void {
		this.clients.delete(clientWs);
	}
	
	public notifyClients(): void {
		const gameUpdate: GameUpdate = {
			type: "update",
			id: this.id,
			state: this.game.getJson()
		};
		const json = JSON.stringify(gameUpdate);
		
		this.clients.forEach(clientWs => {
			clientWs.send(json);
		});
	}
};

const games: Map<GameId, GameServer> = new Map();
const gameServer = new GameServer("game0", "Test Game");
games.set(gameServer.id, gameServer);

app.post("/api/addone", (req: Request, res: Response) => {
	console.log("GET /api/addone " + JSON.stringify(req.body));
	const gameId: GameId = req.body;
	
	const gameServer = games.get(gameId);
	if (!gameServer) {
		res.status(400).end();
		return;
	}
	
	gameServer.game.addOne();
	res.end();
	gameServer.notifyClients();
});

app.post("/api/reset", (req: Request, res: Response) => {
	console.log("GET /api/reset " + JSON.stringify(req.body));
	
	if (!(typeof(req.body) === "string")) {
		res.status(400).end();
		return;
	}
	
	const gameServer = games.get(req.body);
	if (!gameServer) {
		res.status(400).end();
		return;
	}
	
	gameServer.game.resetCounter();
	res.end();
	gameServer.notifyClients();
});

app.post("/api/create", (req: Request, res: Response) => {
	console.log("POST /api/create " + JSON.stringify(req.body));
	const request: CreateGameRequest = req.body;
	
	const gameServer = new GameServer("game" + games.size, request.title);
	games.set(gameServer.id, gameServer);
	
	const response: CreateGameResponse = { id: gameServer.id };
	res.send(response);
});

app.get("/api/state", (req: Request, res: Response) => {
	console.log("GET /api/state " + JSON.stringify(req.query));
	const gameId = req.query.id as string | undefined;
	if (!gameId) {
		res.status(404).end();
		return;
	}
	
	const gameServer = games.get(gameId);
	if (!gameServer) {
		res.status(400).end();
		return;
	}
	
	res.json(gameServer.game.getJson());
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
