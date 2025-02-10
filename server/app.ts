import cors from "cors";
import express from "express";
import expressWs from "express-ws";


import { GameApp } from "./game/app.js";
import { LobbyApp } from "./lobby/app.js"


const PORT = 3000;

const gameApp = new GameApp();
const lobbyApp = new LobbyApp(gameApp);

expressWs(express()).app
	.use(cors())
	.use(express.json({ strict: false }))
	.use(express.static("public"))
	.use("/api/lobby", lobbyApp.getRouter())
	.use("/api/game", gameApp.getRouter())
	.listen(PORT, () => {
		console.log("Server is running on port " + PORT);
	});
