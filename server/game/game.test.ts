import { beforeEach, describe, expect, test, vi } from "vitest";

import { Game } from "./game";
import { LobbyPlayer } from "../lobby/lobby";
import { HttpError } from "../utils/httperror";


function makePlayer(name: string): LobbyPlayer {
	return new LobbyPlayer(
		`private-${name}`,
		`public-${name}`,
		name,
		"#FF0000");
}

describe("Game", () => {
	describe("toJson", () => {
		test("initial state", () => {
			const alice = makePlayer("Alice");
			const game = new Game("id", "Game", [alice]);
			
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
			const game = new Game("id", "Game", [alice, bob]);
			
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
		const game = new Game("id", "Game", [alice]);
		
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
		const game = new Game("id", "Game", [alice, bob, charlie]);
		
		game.getPlayers().getPrivatePlayer(alice.privateId).chips = 30;
		game.getPlayers().getPrivatePlayer(bob.privateId).chips = 10;
		game.getPlayers().getPrivatePlayer(charlie.privateId).chips = 60;
		
		expect(game.makeGameEnd()).to.deep.equal({
			type: "end",
			id: "id",
			rankings: game.getPlayers().rankPlayers()
		});
	});
	
	test("question phase followed by betting phase", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase();
		
		expect(game.toJson(alice.privateId).phase.phase).to.equal("betting");
	});
	
	test("betting phase skipped if no guesses submitted", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		game.endPhase();
		
		expect(game.toJson(alice.privateId).phase.phase).to.equal("question");
	});
	
	test("betting phase followed by question phase", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase();
		game.submitBet(alice.privateId, "Red", 2);
		game.endPhase();
		
		expect(game.toJson(alice.privateId).phase.phase).to.equal("question");
	});
	
	test("round counter increments after betting phase", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		
		expect(game.getRound()).to.equal(1);
		
		game.submitGuess(alice.privateId, 42);
		game.endPhase();
		
		expect(game.getRound()).to.equal(1);
		
		game.endPhase();
		
		expect(game.getRound()).to.equal(2);
	});
	
	test("round counter increments after question phase if no guesses submitted", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		
		expect(game.getRound()).to.equal(1);
		
		game.endPhase();
		
		expect(game.getRound()).to.equal(2);
	});
	
	test("submitGuess notifies update", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		
		const callback = vi.fn();
		game.getUpdates().subscribe(callback);
		
		game.submitGuess(alice.privateId, 42);
		
		expect(callback).toHaveBeenCalled();
	});
	
	test("submitBet notifies update", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase();
		
		const callback = vi.fn();
		game.getUpdates().subscribe(callback);
		
		game.submitBet(alice.privateId, "Red", 2);
		
		expect(callback).toHaveBeenCalled();
	});
	
	test("withdrawBet notifies update", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase();
		game.submitBet(alice.privateId, "Red", 2);
		
		const callback = vi.fn();
		game.getUpdates().subscribe(callback);
		
		game.withdrawBet(alice.privateId, "Red");
		
		expect(callback).toHaveBeenCalled();
	});
	
	test("endPhase notifies update", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		
		const callback = vi.fn();
		game.getUpdates().subscribe(callback);
		
		game.endPhase();
		
		expect(callback).toHaveBeenCalled();
	});
	
	test("endphase notifies gameEnd after final round", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		
		// End the first six rounds.
		game.endPhase();
		game.endPhase();
		game.endPhase();
		game.endPhase();
		game.endPhase();
		game.endPhase();
		
		const updateCallback = vi.fn();
		const gameEndCallback = vi.fn();
		game.getUpdates().subscribe(updateCallback);
		game.getGameEnd().subscribe(gameEndCallback);
		
		game.endPhase();
		
		expect(updateCallback).not.toHaveBeenCalled();
		expect(gameEndCallback).toHaveBeenCalled();
	});
	
	test("can submit guess during question phase", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		
		expect(() => game.submitGuess(alice.privateId, 42)).to.not.throw();
	});
	
	test("cannot submit guess during betting phase", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase();
		
		expect(() => game.submitGuess(alice.privateId, 42))
			.to.throw(HttpError, "Cannot submit guesses during the betting phase.");
	});
	
	test("can submit bet during betting phase", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase();
		
		expect(() => game.submitBet(alice.privateId, "Red", 2)).to.not.throw();
	});
	
	test("cannot submit bet during guessing phase", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		
		expect(() => game.submitBet(alice.privateId, "Red", 2))
			.to.throw(HttpError, "Cannot submit bets during the question phase.");
	});
	
	test("can withdraw bet during betting phase", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		game.submitGuess(alice.privateId, 42);
		game.endPhase();
		game.submitBet(alice.privateId, "Red", 2);
		
		expect(() => game.withdrawBet(alice.privateId, "Red")).to.not.throw();
	});
	
	test("cannot withdraw bet during guessing phase", () => {
		const alice = makePlayer("Alice");
		const game = new Game("id", "Game", [alice]);
		
		expect(() => game.withdrawBet(alice.privateId, "Red"))
			.to.throw(HttpError, "Cannot withdraw bets during the question phase.");
	});
});
