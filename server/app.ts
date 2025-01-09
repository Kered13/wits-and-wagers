import cors from "cors";
import express, { type Request, type Response } from "express";
import expressWs from "express-ws";
import type { WebSocket } from "ws";

import { Game } from "./game/game.js";
import type { GameUpdate } from "../shared/game/update.interface.js";


const expressApp: express.Application = express();
const app: expressWs.Application = expressWs(expressApp).app;

app.use(cors());
app.use(express.json({ strict: false }));
app.use(express.static("public"));

app.get("/", (req, res) => {
	res.send("Hello, World!");
});

const gameId = "game1";
const game = new Game();
const clients: Set<WebSocket> = new Set();

function notifyClients(): void {
	const gameUpdate: GameUpdate = {
		type: "update",
		id: gameId,
		state: game.getJson()
	};
	const json = JSON.stringify(gameUpdate);
	
	clients.forEach(clientWs => {
		clientWs.send(json);
	});
}

app.post("/api/addone", (req: Request, res: Response) => {
	console.log("GET /api/addone " + JSON.stringify(req.body));
	game.addOne();
	res.end();
	notifyClients();
});

app.post("/api/reset", (req: Request, res: Response) => {
	console.log("GET /api/reset " + JSON.stringify(req.body));
	game.resetCounter();
	res.end();
	notifyClients();
});

app.get("/api/state", (req: Request, res: Response) => {
	console.log("GET /api/state " + req.params.id);
	res.json(game.getJson());
});

app.ws("/api/state", (ws: WebSocket) => {
	ws.on('close', () => {
		clients.delete(ws);
	});
	clients.add(ws);
});

const port = 3000;

app.listen(port, () => {
	console.log("Server is running on port " + port);
});
