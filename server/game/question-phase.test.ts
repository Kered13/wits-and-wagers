import { describe, expect, test } from "vitest";

import { PlayerManager, Player } from "./player.js";
import { QuestionPhase } from "./question-phase.js";


function makePlayer(name: string): Player {
	return new Player({
		name: name,
		publicId: `public-${name}`,
		privateId: `private-${name}`,
		color: "#FF0000"
	});
};

describe("QuestionPhase", () => {
	test("toJson shows only own players guess", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		
		const phase = new QuestionPhase("What is the answer?", new PlayerManager([alice, bob, charlie]));
		
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
		
		const phase = new QuestionPhase("What is the answer?", new PlayerManager([alice, bob, charlie]));
		
		expect(phase.getGuesses()).to.deep.equal(new Map());
		
		phase.submitGuess(alice.privateId, 42);
		
		expect(phase.getGuesses()).to.deep.equal(new Map([[alice, 42]]));
		
		phase.submitGuess(charlie.privateId, 7);
		
		expect(phase.getGuesses()).to.deep.equal(new Map([[alice, 42], [charlie, 7]]));
	});
});
