import { describe, expect, test, vi } from "vitest";

import { Game } from "./game.js";
import { GameOptions } from "./game-options.js";
import { Player, Spectator } from "../player/player.js";
import { QuestionGenerator } from "../questions/question-generator.js";
import { HttpError } from "../utils/httperror.js";
import { DEFAULT_BETTING_PHASE_OPTIONS } from "./betting-phase.js";
import { DEFAULT_QUESTION_PHASE_OPTIONS } from "./question-phase.js";
import { DEFAULT_INTERMISSION_PHASE_OPTIONS } from "./intermission-phase.js";


function makePlayer(name: string): Player {
	return new Player({
		name: name,
		publicId: `public-${name}`,
		privateId: `private-${name}`,
		color: "#FF0000"
	});
}


function makeSpectator(name: string): Spectator {
	return new Spectator({
		name: name,
		publicId: `public-${name}`,
		privateId: `private-${name}`,
	});
}


function makeQuestionGenerator() {
	const question = {
		question: "Guess a number?",
		answer: 7,
	};
	return new QuestionGenerator(new Array(7).fill(question), 7);
}


function makeGame(id: string, title: string, players: Player[], spectators?: Spectator[], options?: Partial<GameOptions>): Game {
	// Do not automatically end the question phase. This makes testing easier.
	const gameOpts: GameOptions = Object.assign({},
		DEFAULT_BETTING_PHASE_OPTIONS,
		DEFAULT_QUESTION_PHASE_OPTIONS,
		DEFAULT_INTERMISSION_PHASE_OPTIONS,
		{
			title: title,
			host: players[0],
			endQuestionPhaseWhenAllGuessesSubmitted: false,
			numberOfRounds: 7,
		},
		options);
	return new Game(
		id,
		players,
		spectators ?? [],
		gameOpts,
		makeQuestionGenerator());
}


describe("Game", () => {
	describe("toJson", () => {
		test("initial state", () => {
			const alice = makePlayer("Alice");
			const bob = makeSpectator("Bob");
			const game = makeGame("id", "Game", [alice], [bob]);
			
			expect(game.toJson(alice.privateId)).toEqual({
				title: "Game",
				host: alice.publicId,
				players: [{
					name: alice.name,
					publicId: alice.publicId,
					color: alice.color,
					chips: 2,
				}],
				spectators: [{
					name: bob.name,
					publicId: bob.publicId,
					chips: 2,
				}],
				round: 1,
				phase: {
					phase: "question",
					questionInfo: {
						question: "Guess a number?",
					},
					guesses: {
						"public-Alice": false,
					},
				},
			});
		});
		
		test("toJson only shows own player guess", () => {
			const alice = makePlayer("Alice");
			const bob = makePlayer("Bob");
			const game = makeGame("id", "Game", [alice, bob]);
			
			game.submitGuess(alice.privateId, 42);
			game.submitGuess(bob.privateId, 42);
			
			expect(game.toJson(alice.privateId)).toEqual({
				title: "Game",
				host: alice.publicId,
				players: [
					{
						name: alice.name,
						publicId: alice.publicId,
						color: alice.color,
						chips: 2,
					},
					{
						name: bob.name,
						publicId: bob.publicId,
						color: bob.color,
						chips: 2,
					},
				],
				spectators: [],
				round: 1,
				phase: {
					phase: "question",
					questionInfo: {
						question: "Guess a number?",
					},
					guesses: {
						"public-Alice": 42,
						"public-Bob": true,
					},
				}
			});
		});
		
		test("game over", () => {
			const alice = makePlayer("Alice");
			const bob = makePlayer("Bob");
			const charlie = makePlayer("Charlie");
			const derek = makeSpectator("Derek");

			alice.chips = 30;
			bob.chips = 10;
			charlie.chips = 60;
			derek.chips = 50;
			
			const game = makeGame("id", "Game", [alice, bob, charlie], [derek]);
			
			for (let i = 0; i < 7; i++) {
				game.endPhase(alice.privateId);
				game.endPhase(alice.privateId);
			}
			
			const expectedPlayers = [
				{
					name: alice.name,
					publicId: alice.publicId,
					color: alice.color,
					chips: 30,
				},
				{
					name: bob.name,
					publicId: bob.publicId,
					color: bob.color,
					chips: 10,
				},
				{
					name: charlie.name,
					publicId: charlie.publicId,
					color: charlie.color,
					chips: 60,
				},
			];
			
			const actualJson = game.toJson(alice.privateId);
			
			expect(actualJson).to.deep.equal({
				title: "Game",
				host: alice.publicId,
				players: expectedPlayers,
				spectators: [{
					name: derek.name,
					publicId: derek.publicId,
					chips: 50,
				}],
				round: 8,
				phase: {
					phase: "game-over",
				},
			});
			expect(actualJson.players).to.deep.ordered.members(expectedPlayers);
		});
	});
	
	test("makeUpdate", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		expect(game.makeUpdate(alice.privateId)).to.deep.equal({
			type: "update",
			state: game.toJson(alice.privateId),
		});
	});
	
	test("question phase followed by betting phase", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		
		expect(game.toJson(alice.privateId).phase.phase).to.equal("betting");
	});
	
	test("betting phase skipped if no guesses submitted", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.endPhase(alice.privateId);
		
		expect(game.toJson(alice.privateId).phase.phase).to.equal("intermission");
	});
	
	test("betting phase followed by intermission phase", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		game.submitBet(alice.privateId, "Red", 2);
		game.endPhase(alice.privateId);
		
		expect(game.toJson(alice.privateId).phase.phase).to.equal("intermission");
	});

	test("intermission phase followed by question phase", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		game.submitBet(alice.privateId, "Red", 2);
		game.endPhase(alice.privateId);
		game.endPhase(alice.privateId);

		expect(game.toJson(alice.privateId).phase.phase).to.equal("question");
	});
	
	test("round counter increments after intermission phase", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		expect(game.getRound()).to.equal(1);
		
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		expect(game.getRound()).to.equal(1);
		
		game.endPhase(alice.privateId);
		expect(game.getRound()).to.equal(1);
		
		game.endPhase(alice.privateId);
		expect(game.getRound()).to.equal(2);
	});
	
	test("submitGuess notifies update", () => {
		const alice = makePlayer("Alice");1
		const game = makeGame("id", "Game", [alice]);
		
		const callback = vi.fn();
		game.onUpdates().subscribe(callback);
		
		game.submitGuess(alice.privateId, 42);
		
		expect(callback).toHaveBeenCalled();
	});
	
	test("submitBet notifies update", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		
		const callback = vi.fn();
		game.onUpdates().subscribe(callback);
		
		game.submitBet(alice.privateId, "Red", 2);
		
		expect(callback).toHaveBeenCalled();
	});
	
	test("endPhase notifies update", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		
		const callback = vi.fn();
		game.onUpdates().subscribe(callback);
		
		game.endPhase(alice.privateId);
		
		expect(callback).toHaveBeenCalled();
	});
	
	test("endPhase notifies and completes updates after final round", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End the first six rounds.
		for (let i = 0; i < 6; i++) {
			game.endPhase(alice.privateId);
			game.endPhase(alice.privateId);
		}
		
		const updateCallback = vi.fn();
		const gameEndCallback = vi.fn();
		game.onUpdates().subscribe({
			next: updateCallback,
			complete: gameEndCallback,
		});
		
		game.endPhase(alice.privateId);
		game.endPhase(alice.privateId);
		
		expect(updateCallback).toHaveBeenCalled();
		expect(gameEndCallback).toHaveBeenCalled();
	});
	
	test("game ends after specified number of rounds", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice], [], { numberOfRounds: 3 });
		
		// End the first two rounds.
		for (let i = 0; i < 2; i++) {
			game.endPhase(alice.privateId);
			game.endPhase(alice.privateId);
		}
		
		const updateCallback = vi.fn();
		const gameEndCallback = vi.fn();
		game.onUpdates().subscribe({
			next: updateCallback,
			complete: gameEndCallback,
		});
		
		game.endPhase(alice.privateId);
		game.endPhase(alice.privateId);
		
		expect(updateCallback).toHaveBeenCalled();
		expect(gameEndCallback).toHaveBeenCalled();
	});
	
	test("can submit guess during question phase", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		expect(() => game.submitGuess(alice.privateId, 42)).to.not.throw();
	});
	
	test("cannot submit guess during betting phase", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		
		expect(() => game.submitGuess(alice.privateId, 42))
			.to.throw(HttpError, "Cannot submit guesses during the betting phase.");
	});
	
	test("can submit bet during betting phase", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		
		expect(() => game.submitBet(alice.privateId, "Red", 2)).to.not.throw();
	});
	
	test("cannot submit bet during guessing phase", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		expect(() => game.submitBet(alice.privateId, "Red", 2))
			.to.throw(HttpError, "Cannot submit bets during the question phase.");
	});
	
	test("cannot submit guess after game over", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End all seven rounds.
		for (let i = 0; i < 7; i++) {
			game.endPhase(alice.privateId);
			game.endPhase(alice.privateId);
		}
		
		expect(() => game.submitGuess(alice.privateId, 42))
			.to.throw(HttpError, "Game is over, cannot submit guesses.");
	});
	
	test("cannot submit bets after game over", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End all seven rounds.
		for (let i = 0; i < 7; i++) {
			game.endPhase(alice.privateId);
			game.endPhase(alice.privateId);
		}
		
		expect(() => game.submitBet(alice.privateId, "Red", 2))
			.to.throw(HttpError, "Game is over, cannot submit bets.");
	});
	
	test("cannot endPhase after game over", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End all seven rounds.
		for (let i = 0; i < 7; i++) {
			game.endPhase(alice.privateId);
			game.endPhase(alice.privateId);
		}
		
		expect(() => game.endPhase(alice.privateId))
			.to.throw(HttpError, "Game is over, cannot end phase.");
	});
	
	test("only host can end phase", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		// Alice is the host.
		const game = makeGame("id", "Game", [alice, bob]);
		
		expect(() => game.endPhase(bob.privateId))
			.to.throw(HttpError, "Only the host can end the phase.");
	});
	
	test("spectator can join in middle of game", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		const callback = vi.fn();
		game.onUpdates().subscribe(callback);
		
		const bob = game.addSpectator("Bob");
		expect(bob.name).to.equal("Bob");
		expect(bob.chips).to.equal(2);
		
		expect(game.toJson(bob.privateId)).toEqual({
			title: "Game",
			host: alice.publicId,
			players: [{
				name: alice.name,
				publicId: alice.publicId,
				color: alice.color,
				chips: 2,
			}],
			spectators: [{
				name: bob.name,
				publicId: bob.publicId,
				chips: 2,
			}],
			round: 1,
			phase: {
				phase: "question",
				questionInfo: {
					question: "Guess a number?",
				},
				guesses: {
					"public-Alice": false
				},
			},
		});
		
		expect(callback).toHaveBeenCalled();
	});
});
