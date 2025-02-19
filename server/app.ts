import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import expressWs from "express-ws";


import { GameApp } from "./game/app.js";
import { LobbyApp } from "./lobby/app.js"
import { LOBBY_API_ROOT } from "../shared/lobby/lobby.js";
import { GAME_API_ROOT } from "../shared/game/game.js";


const PORT = 3000;

const gameApp = new GameApp();
const lobbyApp = new LobbyApp(gameApp);


function logRequest(req: Request, res: Response, next: NextFunction): void {
	console.log(`${req.method} ${ req.originalUrl } ${ JSON.stringify(req.body) }`);
	next();
}


expressWs(express()).app
	.use(cors())
	.use(express.json({ strict: false }))
	.use(express.static("public"))
	.use(logRequest)
	.use(LOBBY_API_ROOT, lobbyApp.getRouter())
	.use(GAME_API_ROOT, gameApp.getRouter())
	.listen(PORT, () => {
		console.log("Server is running on port " + PORT);
	});
