import { describe, expect, test, vi } from "vitest";

import { Game, GameOptions } from "./game.js";
import { Player } from "./player.js";
import { HttpError } from "../utils/httperror.js";
import { QuestionGenerator } from "../questions/question-generator.js";


function makePlayer(name: string): Player {
	return new Player({
		name: name,
		publicId: `public-${name}`,
		privateId: `private-${name}`,
		color: "#FF0000"
	});
}


function makeQuestionGenerator() {
	const question = {
		question: "Guess a number?",
		answer: 7
	};
	return new QuestionGenerator(new Array(7).fill(question));
}


function makeGame(id: string, title: string, players: Player[], options?: Partial<GameOptions>): Game {
	// Do not automatically end the question phase. This makes testing easier.
	return new Game(
		id,
		title,
		players[0],
		players,
		makeQuestionGenerator(),
		Object.assign({}, { endQuestionPhaseWhenAllGuessesSubmitted: false }, options));
}


describe("Game", () => {
	describe("toJson", () => {
		test("initial state", () => {
			const alice = makePlayer("Alice");
			const game = makeGame("id", "Game", [alice]);
			
			expect(game.toJson(alice.privateId)).to.deep.equal({
				title: "Game",
				host: alice.publicId,
				players: [{
					name: alice.name,
					publicId: alice.publicId,
					color: alice.color,
					chips: 2
				}],
				round: 1,
				phase: {
					phase: "question",
					question: "Guess a number?",
					guesses: {
						"public-Alice": false
					}
				}
			});
		});
		
		test("toJson only shows own player", () => {
			const alice = makePlayer("Alice");
			const bob = makePlayer("Bob");
			const game = makeGame("id", "Game", [alice, bob]);
			
			game.submitGuess(alice.privateId, 42);
			game.submitGuess(bob.privateId, 42);
			
			expect(game.toJson(alice.privateId)).to.deep.equal({
				title: "Game",
				host: alice.publicId,
				players: [{
					name: alice.name,
					publicId: alice.publicId,
					color: alice.color,
					chips: 2
				},
				{
					name: bob.name,
					publicId: bob.publicId,
					color: bob.color,
					chips: 2
				}],
				round: 1,
				phase: {
					phase: "question",
					question: "Guess a number?",
					guesses: {
						"public-Alice": 42,
						"public-Bob": true
					}
				}
			});
		});
		
		test("game over", () => {
			const alice = makePlayer("Alice");
			const bob = makePlayer("Bob");
			const charlie = makePlayer("Charlie");
			const game = makeGame("id", "Game", [alice, bob, charlie]);
			
			alice.chips = 30;
			bob.chips = 10;
			charlie.chips = 60;
			
			for (let i = 0; i < 7; i++) {
				game.endPhase(alice.privateId);
			}
			
			const expectedPlayers = [{
				name: charlie.name,
				publicId: charlie.publicId,
				color: charlie.color,
				chips: 60
			},
			{
				name: alice.name,
				publicId: alice.publicId,
				color: alice.color,
				chips: 30
			},
			{
				name: bob.name,
				publicId: bob.publicId,
				color: bob.color,
				chips: 10
			}];
			
			const actualJson = game.toJson(alice.privateId);
			
			expect(actualJson).to.deep.equal({
				title: "Game",
				host: alice.publicId,
				players: expectedPlayers,
				round: 8,
				phase: {
					phase: "game-over"
				}
			});
			expect(actualJson.players).to.deep.ordered.members(expectedPlayers);
		});
	});
	
	test("makeUpdate", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		expect(game.makeUpdate(alice.privateId)).to.deep.equal({
			type: "update",
			id: "id",
			state: game.toJson(alice.privateId)
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
		
		expect(game.toJson(alice.privateId).phase.phase).to.equal("question");
	});
	
	test("betting phase followed by question phase", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		game.submitBet(alice.privateId, "Red", 2);
		game.endPhase(alice.privateId);
		
		expect(game.toJson(alice.privateId).phase.phase).to.equal("question");
	});
	
	test("round counter increments after betting phase", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		expect(game.getRound()).to.equal(1);
		
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		
		expect(game.getRound()).to.equal(1);
		
		game.endPhase(alice.privateId);
		
		expect(game.getRound()).to.equal(2);
	});
	
	test("round counter increments after question phase if no guesses submitted", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
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
	
	test("withdrawBet notifies update", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		game.submitBet(alice.privateId, "Red", 2);
		
		const callback = vi.fn();
		game.onUpdates().subscribe(callback);
		
		game.withdrawBet(alice.privateId, "Red");
		
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
	
	test("end betting phase notifies roundEnd with EndRoundNotification", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		const callback = vi.fn();
		game.onRoundEnd().subscribe(callback);
		
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		
		game.submitBet(alice.privateId, "AllTooHigh", 2);
		game.endPhase(alice.privateId);
		
		expect(callback).toHaveBeenCalledWith({
			type: "end-round",
			id: "id",
			endRound: {
				question: "Guess a number?",
				answer: 7,
				outcome: {
					type: "conclusion",
					winners: [],
					earnings: {
						[alice.publicId]: 14
					}
				}
			}
		});
	});
	
	test("end question phase with no guesses notifies roundEnd with EndRoundNotification", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		const callback = vi.fn();
		game.onRoundEnd().subscribe(callback);
		
		game.endPhase(alice.privateId);
		
		expect(callback).toHaveBeenCalledWith({
			type: "end-round",
			id: "id",
			endRound: {
				question: "Guess a number?",
				answer: 7,
				outcome: {
					type: "skipped",
				}
			}
		});
	});
	
	test("endPhase notifies and completes updates and roundEnd after final round", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End the first six rounds.
		for (let i = 0; i < 6; i++) {
			game.endPhase(alice.privateId);
		}
		
		const updateCallback = vi.fn();
		const gameEndCallback = vi.fn();
		const roundEndCallback = vi.fn();
		const roundEndGameEndCallback = vi.fn();
		game.onUpdates().subscribe({
			next: updateCallback,
			complete: gameEndCallback
		});
		game.onRoundEnd().subscribe({
			next: roundEndCallback,
			complete: roundEndGameEndCallback
		});
		
		game.endPhase(alice.privateId);
		
		expect(updateCallback).toHaveBeenCalled();
		expect(gameEndCallback).toHaveBeenCalled();
		expect(roundEndCallback).toHaveBeenCalled();
		expect(roundEndGameEndCallback).toHaveBeenCalled();
	});
	
	test("game ends after specified number of rounds", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice], { numberOfRounds: 3 });
		
		// End the first two rounds.
		for (let i = 0; i < 2; i++) {
			game.endPhase(alice.privateId);
		}
		
		const updateCallback = vi.fn();
		const gameEndCallback = vi.fn();
		const roundEndCallback = vi.fn();
		const roundEndGameEndCallback = vi.fn();
		game.onUpdates().subscribe({
			next: updateCallback,
			complete: gameEndCallback
		});
		game.onRoundEnd().subscribe({
			next: roundEndCallback,
			complete: roundEndGameEndCallback
		});
		
		game.endPhase(alice.privateId);
		
		expect(updateCallback).toHaveBeenCalled();
		expect(gameEndCallback).toHaveBeenCalled();
		expect(roundEndCallback).toHaveBeenCalled();
		expect(roundEndGameEndCallback).toHaveBeenCalled();
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
	
	test("can withdraw bet during betting phase", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		game.submitBet(alice.privateId, "Red", 2);
		
		expect(() => game.withdrawBet(alice.privateId, "Red")).to.not.throw();
	});
	
	test("cannot withdraw bet during guessing phase", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		expect(() => game.withdrawBet(alice.privateId, "Red"))
			.to.throw(HttpError, "Cannot withdraw bets during the question phase.");
	});
	
	test("cannot submit guess after game over", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End all seven rounds.
		for (let i = 0; i < 7; i++) {
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
		}
		
		expect(() => game.submitBet(alice.privateId, "Red", 2))
			.to.throw(HttpError, "Game is over, cannot submit bets.");
	});
	
	test("cannot withdraw bets after game over", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End all seven rounds.
		for (let i = 0; i < 7; i++) {
			game.endPhase(alice.privateId);
		}
		
		expect(() => game.withdrawBet(alice.privateId, "Red"))
			.to.throw(HttpError, "Game is over, cannot withdraw bets.");
	});
	
	test("cannot endPhase after game over", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End all seven rounds.
		for (let i = 0; i < 7; i++) {
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
});
