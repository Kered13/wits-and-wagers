import cors from "cors";
import express from "express";

import { Game } from "./game/game.js";


const app = express();

app.use(cors());

app.use(express.json());

app.use(express.static("public"));

app.get("/", (req, res) => {
	res.send("Hello, World!");
});

const game = new Game();

app.post("/api/addone", (req, res) => {
	console.log("GET /api/state");
	game.addOne();
	res.json(game.getJson());
});

app.post("/api/reset", (req, res) => {
	console.log("GET /api/state");
	game.resetCounter();
	res.json(game.getJson());
});

app.get("/api/state", (req, res) => {
	console.log("GET /api/state");
	res.json(game.getJson());
});

const port = 3000;

app.listen(port, () => {
	console.log("Server is running on port " + port);
});
