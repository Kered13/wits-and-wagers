import { describe, expect, test, vi } from "vitest";

import { PlayerManager, Player } from "./player.js";
import { QuestionPhase, questionPhaseDefaultOptions, QuestionPhaseOptions } from "./question-phase.js";


function makePlayer(name: string): Player {
	return new Player({
		name: name,
		publicId: `public-${name}`,
		privateId: `private-${name}`,
		color: "#FF0000"
	});
};


function makeQuestionPhase(
		obj: {
		players: Player[],
			question?: string,
			options?: Partial<QuestionPhaseOptions>
		}): QuestionPhase {
	const players = new PlayerManager(obj.players);
	const question = obj.question ?? "What is the answer?";
	const options = Object.assign({},
		questionPhaseDefaultOptions,
		{ endQuestionPhaseWhenAllGuessesSubmitted: false },
		obj.options);
	return new QuestionPhase(question, players, options);
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
	
	test("toJson reports round time and end time if option specified", () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		
		const alice = makePlayer("Alice");
		
		const phase = makeQuestionPhase({
			question: "What is the answer?",
			players: [alice],
			options: { questionPhaseDuration: 60_000 },
		});
		
		expect(phase.toJson(alice.privateId)).to.deep.equal({
			phase: "question",
			question: "What is the answer?",
			guesses: {
				"public-Alice": false,
			},
			roundDuration: 60_000,
			roundEnd: 1_060_000
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
	
	test("endPhase is idempotent", () => {
		const alice = makePlayer("Alice");
		const phase = makeQuestionPhase({ players: [alice] });
		
		phase.endPhase();
		
		const callback = vi.fn();
		phase.onEndPhase().subscribe(callback);
		phase.endPhase();
		
		expect(callback).not.toHaveBeenCalled();
	});
	
	test("endPhase called after timeout", () => {
		vi.useFakeTimers();
		
		const alice = makePlayer("Alice");
		const phase = makeQuestionPhase({
			players: [alice],
			options: { questionPhaseDuration: 60_000 }
		});
		
		const callback = vi.fn();
		phase.onEndPhase().subscribe(callback);
		
		vi.advanceTimersByTime(60_000);
		expect(callback).toHaveBeenCalled();
	});
});
