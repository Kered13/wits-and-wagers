import { describe, expect, test, vi } from "vitest";

import { PlayerManager, Player } from "./player.js";
import { QuestionPhase, QuestionPhaseOptions } from "./question-phase.js";


function makePlayer(name: string): Player {
	return new Player({
		name: name,
		publicId: `public-${name}`,
		privateId: `private-${name}`,
		color: "#FF0000"
	});
};


function makeQuestionPhase(obj: { question?: string, players: Player[], options?: QuestionPhaseOptions }): QuestionPhase {
	return new QuestionPhase(
		obj.question ?? "What is the answer?",
		new PlayerManager(obj.players),
		Object.assign({ endQuestionPhaseWhenAllGuessesSubmitted: false }, obj.options));
}


describe("QuestionPhase", () => {
	test("toJson shows only own players guess", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		
		const phase = makeQuestionPhase({
			question: "What is the answer?",
			players: [alice, bob, charlie]
		});
		
		expect(phase.toJson(alice.privateId)).to.deep.equal({
			phase: "question",
			question: "What is the answer?",
			guesses: {
				"public-Alice": false,
				"public-Bob": false,
				"public-Charlie": false
			}
		});
		expect(phase.toJson(bob.privateId)).to.deep.equal({
			phase: "question",
			question: "What is the answer?",
			guesses: {
				"public-Alice": false,
				"public-Bob": false,
				"public-Charlie": false
			}
		});
		expect(phase.toJson(charlie.privateId)).to.deep.equal({
			phase: "question",
			question: "What is the answer?",
			guesses: {
				"public-Alice": false,
				"public-Bob": false,
				"public-Charlie": false
			}
		});
		
		phase.submitGuess(alice.privateId, 42);
		
		expect(phase.toJson(alice.privateId)).to.deep.equal({
			phase: "question",
			question: "What is the answer?",
			guesses: {
				"public-Alice": 42,
				"public-Bob": false,
				"public-Charlie": false
			}
		});
		expect(phase.toJson(bob.privateId)).to.deep.equal({
			phase: "question",
			question: "What is the answer?",
			guesses: {
				"public-Alice": true,
				"public-Bob": false,
				"public-Charlie": false
			}
		});
		expect(phase.toJson(charlie.privateId)).to.deep.equal({
			phase: "question",
			question: "What is the answer?",
			guesses: {
				"public-Alice": true,
				"public-Bob": false,
				"public-Charlie": false
			}
		});
		
		phase.submitGuess(charlie.privateId, 7);
		
		expect(phase.toJson(alice.privateId)).to.deep.equal({
			phase: "question",
			question: "What is the answer?",
			guesses: {
				"public-Alice": 42,
				"public-Bob": false,
				"public-Charlie": true
			}
		});
		expect(phase.toJson(bob.privateId)).to.deep.equal({
			phase: "question",
			question: "What is the answer?",
			guesses: {
				"public-Alice": true,
				"public-Bob": false,
				"public-Charlie": true
			}
		});
		expect(phase.toJson(charlie.privateId)).to.deep.equal({
			phase: "question",
			question: "What is the answer?",
			guesses: {
				"public-Alice": true,
				"public-Bob": false,
				"public-Charlie": 7
			}
		});
	});
	
	test("getGuesses returns all guesses", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		
		const phase = makeQuestionPhase({ players: [alice, bob, charlie] });
		
		expect(phase.getGuesses()).to.deep.equal(new Map());
		
		phase.submitGuess(alice.privateId, 42);
		
		expect(phase.getGuesses()).to.deep.equal(new Map([[alice, 42]]));
		
		phase.submitGuess(charlie.privateId, 7);
		
		expect(phase.getGuesses()).to.deep.equal(new Map([[alice, 42], [charlie, 7]]));
	});
	
	test("all guesses submitted ends phase when option set", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		const phase = makeQuestionPhase({
			players: [alice, bob, charlie],
			options: { endQuestionPhaseWhenAllGuessesSubmitted: true }
		});
		
		const callback = vi.fn();
		phase.onEndPhase().subscribe(callback);
		
		phase.submitGuess(alice.privateId, 42);
		expect(callback).not.toHaveBeenCalled();
		phase.submitGuess(bob.privateId, 52);
		expect(callback).not.toHaveBeenCalled();
		phase.submitGuess(charlie.privateId, 62);
		expect(callback).toHaveBeenCalled();
	});
	
	test("all guesses submitted does not end phase when option not set", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		const phase = makeQuestionPhase({
			players: [alice, bob, charlie],
			options: { endQuestionPhaseWhenAllGuessesSubmitted: false }
		});
		
		const callback = vi.fn();
		phase.onEndPhase().subscribe(callback);
		
		phase.submitGuess(alice.privateId, 42);
		phase.submitGuess(bob.privateId, 52);
		phase.submitGuess(charlie.privateId, 62);
		expect(callback).not.toHaveBeenCalled();
	});
	
	test("endPhase notifies subscribers", () => {
		const alice = makePlayer("Alice");
		const phase = makeQuestionPhase({ players: [alice] });
		
		const callback = vi.fn();
		phase.onEndPhase().subscribe(callback);
		phase.endPhase();
		
		expect(callback).toHaveBeenCalled();
	});
});
