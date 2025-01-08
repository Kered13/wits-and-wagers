import cors from "cors";
import express from "express";
import expressWs from "express-ws";
import type { WebSocket } from "ws";

import { Game } from "./game/game.js";


const expressApp: express.Application = express();
const app: expressWs.Application = expressWs(expressApp).app;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
	res.send("Hello, World!");
});

const game = new Game();
const clients: Set<WebSocket> = new Set();

function notifyClients(): void {
	const json = JSON.stringify(game.getJson());
	clients.forEach(clientWs => {
		clientWs.send(json);
	});
}

app.post("/api/addone", (req, res) => {
	console.log("GET /api/addone");
	game.addOne();
	res.end();
	notifyClients();
});

app.post("/api/reset", (req, res) => {
	console.log("GET /api/reset");
	game.resetCounter();
	res.end();
	notifyClients();
});

app.get("/api/state", (req, res) => {
	console.log("GET /api/state");
	res.json(game.getJson());
});

app.ws("/api/state", (ws, req) => {
	console.log("WebSocket connected");
	ws.on('close', () => {
		console.log("WebSocket closed");
		clients.delete(ws);
	});
	clients.add(ws);
});

const port = 3000;

app.listen(port, () => {
	console.log("Server is running on port " + port);
});
