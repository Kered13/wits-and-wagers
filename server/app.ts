import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import expressWs from "express-ws";
import readlinePromises from "node:readline/promises";


import { GameApp } from "./game/app.js";
import { GameFactory } from "./game/game-factory.js";
import { LobbyApp } from "./lobby/app.js"
import { LobbyFactory } from "./lobby/lobby-factory.js";
import { QuestionApp } from "./questions/app.js";
import { findQuestionSetsOnFilesystem } from "./questions/question-loading.js";
import { QuestionSetManager } from "./questions/question-set-manager.js";
import { LOBBY_API_ROOT } from "../shared/lobby/lobby.js";
import { GAME_API_ROOT } from "../shared/game/game.js";
import { QUESTIONS_API_ROOT } from "../shared/questions/questions.js";


const PORT = 3000;


function logRequest(req: Request, res: Response, next: NextFunction): void {
	console.log(`${req.method} ${req.originalUrl} ${JSON.stringify(req.body)}`);
	next();
}


async function main(port: number) {
	const questionSets = await findQuestionSetsOnFilesystem("server/data/questions");
	
	const questionSetManager = new QuestionSetManager(questionSets);
	const gameFactory = new GameFactory(questionSetManager);
	const lobbyFactory = new LobbyFactory(gameFactory, questionSetManager);
	const gameApp = new GameApp();
	const lobbyApp = new LobbyApp(gameApp, lobbyFactory);
	const questionsApp = new QuestionApp(questionSetManager);
	
	const server = expressWs(express()).app
		.use(cors())
		.use(express.json({ strict: false }))
		.use(logRequest)
		.use(express.static("public"))
		.use(express.static("dist/client/browser"))
		.use(LOBBY_API_ROOT, lobbyApp.getRouter())
		.use(GAME_API_ROOT, gameApp.getRouter())
		.use(QUESTIONS_API_ROOT, questionsApp.getRouter())
		.get("*", (req, res) => res.sendFile("dist/client/browser/index.html", { root: process.cwd() }))
		.listen(port, () => console.log("Server is running on port " + port));
	
	// Simple console interface to terminate websockets for testing.
	// TODO: Remove when disconnect testing is no longer needed.
	(async () => {
		const rl = readlinePromises.createInterface({ input: process.stdin, output: process.stdout });
		
		let input = "";
		do {
			input = await rl.question("? ");
			if (input === "r") {
				lobbyApp.terminateWebsockets();
				gameApp.terminateWebsockets();
			}
		} while (input !== "q");
		
		console.log("Shutting down server...");
		server.close(() => process.exit());
	})();
}


main(PORT);
