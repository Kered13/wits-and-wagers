import { describe, expect, test, vi } from "vitest";

import { Game } from "./game";
import { Player } from "./player";
import { HttpError } from "../utils/httperror";


function makePlayer(name: string): Player {
	return new Player({
		name: name,
		publicId: `public-${name}`,
		privateId: `private-${name}`,
		color: "#FF0000"
	});
}


function makeGame(id: string, title: string, players: Player[]): Game {
	// Do not automatically end the question phase. This makes testing easier.
	return new Game(id, title, players, { endQuestionPhaseWhenAllGuessesSubmitted: false });
}


describe("Game", () => {
	describe("toJson", () => {
		test("initial state", () => {
			const alice = makePlayer("Alice");
			const game = makeGame("id", "Game", [alice]);
			
			expect(game.toJson(alice.privateId)).to.deep.equal({
				title: "Game",
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
	
	test("makeEnd", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		const game = makeGame("id", "Game", [alice, bob, charlie]);
		
		alice.chips = 30;
		bob.chips = 10;
		charlie.chips = 60;
		
		expect(game.makeGameEnd()).to.deep.equal({
			type: "end",
			id: "id",
			rankings: game.getPlayers().rankPlayers()
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
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		const callback = vi.fn();
		game.getUpdates().subscribe(callback);
		
		game.submitGuess(alice.privateId, 42);
		
		expect(callback).toHaveBeenCalled();
	});
	
	test("submitBet notifies update", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase(alice.privateId);
		
		const callback = vi.fn();
		game.getUpdates().subscribe(callback);
		
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
		game.getUpdates().subscribe(callback);
		
		game.withdrawBet(alice.privateId, "Red");
		
		expect(callback).toHaveBeenCalled();
	});
	
	test("endPhase notifies update", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		
		const callback = vi.fn();
		game.getUpdates().subscribe(callback);
		
		game.endPhase(alice.privateId);
		
		expect(callback).toHaveBeenCalled();
	});
	
	test("endphase notifies gameEnd after final round", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End the first six rounds.
		for (let i = 0; i < 6; i++) {
			game.endPhase(alice.privateId);
		}
		
		const updateCallback = vi.fn();
		const gameEndCallback = vi.fn();
		game.getUpdates().subscribe(updateCallback);
		game.getGameEnd().subscribe(gameEndCallback);
		
		game.endPhase(alice.privateId);
		
		expect(updateCallback).not.toHaveBeenCalled();
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
	
	test("cannot submit guess after game end", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End all seven rounds.
		for (let i = 0; i < 7; i++) {
			game.endPhase(alice.privateId);
		}
		
		expect(() => game.submitGuess(alice.privateId, 42))
			.to.throw(HttpError, "Game is over, cannot submit guesses.");
	});
	
	test("cannot submit bets after game end", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End all seven rounds.
		for (let i = 0; i < 7; i++) {
			game.endPhase(alice.privateId);
		}
		
		expect(() => game.submitBet(alice.privateId, "Red", 2))
			.to.throw(HttpError, "Game is over, cannot submit bets.");
	});
	
	test("cannot withdraw bets after game end", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End all seven rounds.
		for (let i = 0; i < 7; i++) {
			game.endPhase(alice.privateId);
		}
		
		expect(() => game.withdrawBet(alice.privateId, "Red"))
			.to.throw(HttpError, "Game is over, cannot withdraw bets.");
	});
	
	test("cannot endPhase after game end", () => {
		const alice = makePlayer("Alice");
		const game = makeGame("id", "Game", [alice]);
		
		// End all seven rounds.
		for (let i = 0; i < 7; i++) {
			game.endPhase(alice.privateId);
		}
		
		expect(() => game.endPhase(alice.privateId))
			.to.throw(HttpError, "Game is over, cannot end phase.");
	});
});
