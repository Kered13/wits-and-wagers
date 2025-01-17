import cors from "cors";
import express from "express";
import expressWs from "express-ws";


import { LobbyApp } from "./lobby/app.js"
import { GameApp } from "./game/app.js"

const app: expressWs.Application = expressWs(express()).app;

app.use(cors());
app.use(express.json({ strict: false }));
app.use(express.static("public"));

const lobbyApp = new LobbyApp();
const gameApp = new GameApp(lobbyApp);

app.use("/api/lobby", lobbyApp.getRouter());
app.use("/api/game", gameApp.getRouter());

const port = 3000;

app.listen(port, () => {
	console.log("Server is running on port " + port);
});
