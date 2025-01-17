import cors from "cors";
import express from "express";
import expressWs from "express-ws";


import { LobbyApp } from "./lobby/app.js"
import { GameApp } from "./game/app.js"


const PORT = 3000;

const lobbyApp = new LobbyApp();
const gameApp = new GameApp(lobbyApp);

expressWs(express()).app
	.use(cors())
	.use(express.json({ strict: false }))
	.use(express.static("public"))
	.use("/api/lobby", lobbyApp.getRouter())
	.use("/api/game", gameApp.getRouter())
	.listen(PORT, () => {
		console.log("Server is running on port " + PORT);
	});
