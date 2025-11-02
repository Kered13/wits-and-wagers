import { describe, expect, test, vi } from "vitest";

import { QuestionPhase, DEFAULT_QUESTION_PHASE_OPTIONS, QuestionPhaseOptions } from "./question-phase.js";
import { Player, Spectator } from "../player/player.js";
import { QuestionAnswerInfo } from "../../shared/game/question.js";
import { PlayerManager } from "../player/player-manager.js";
import { privateId, publicId } from "../player/player-id.js";


function makePlayer(name: string): Player {
	return new Player({
		name: name,
		publicId: publicId(`public-${name}`),
		privateId: privateId(`private-${name}`),
		color: "#FF0000"
	});
};


function makeSpectator(name: string): Spectator {
	return new Spectator({
		name: name,
		publicId: publicId(`public-${name}`),
		privateId: privateId(`private-${name}`),
	});
};


function makeQuestionPhase(
		obj: {
			players: Player[],
			spectators?: Spectator[],
			qa?: QuestionAnswerInfo | string,
			options?: Partial<QuestionPhaseOptions>
		}): QuestionPhase {
	const playerManager = new PlayerManager(obj.players, obj.spectators ?? []);
	const question = typeof(obj.qa) !== "object" ?
		{ question: obj.qa ?? "What is the answer?", answer: 7 } :
		obj.qa;
	const options = Object.assign({},
		DEFAULT_QUESTION_PHASE_OPTIONS,
		{ endQuestionPhaseWhenAllGuessesSubmitted: false },
		obj.options);
	return new QuestionPhase(question, playerManager, options);
}


describe("QuestionPhase", () => {
	test("toJson shows only own player's guess", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		
		const phase = makeQuestionPhase({
			qa: "What is the answer?",
			players: [alice, bob, charlie],
		});
		
		phase.submitGuess(alice.privateId, 42);
		phase.submitGuess(charlie.privateId, 7);
		
		expect(phase.toJson(alice.privateId)).toEqual({
			phase: "question",
			questionInfo: {
				question: "What is the answer?",
			},
			guesses: {
				"public-Alice": 42,
				"public-Bob": false,
				"public-Charlie": true,
			},
		});
		expect(phase.toJson(bob.privateId)).toEqual({
			phase: "question",
			questionInfo: {
				question: "What is the answer?",
			},
			guesses: {
				"public-Alice": true,
				"public-Bob": false,
				"public-Charlie": true,
			},
		});
		expect(phase.toJson(charlie.privateId)).toEqual({
			phase: "question",
			questionInfo: {
				question: "What is the answer?",
			},
			guesses: {
				"public-Alice": true,
				"public-Bob": false,
				"public-Charlie": 7,
			},
		});
	});
	
	test("toJson only reports own spectator's guess", () => {
		const alice = makePlayer("Alice");
		const bob = makeSpectator("Bob");
		const charlie = makeSpectator("Charlie");
		
		const phase = makeQuestionPhase({
			qa: "What is the answer?",
			players: [alice],
			spectators: [bob, charlie],
		});
		
		phase.submitGuess(alice.privateId, 42);
		phase.submitGuess(bob.privateId, 7);
		
		expect(phase.toJson(alice.privateId)).toEqual({
			phase: "question",
			questionInfo: {
				question: "What is the answer?",
			},
			guesses: {
				"public-Alice": 42,
			},
		});
		expect(phase.toJson(bob.privateId)).toEqual({
			phase: "question",
			questionInfo: {
				question: "What is the answer?",
			},
			guesses: {
				"public-Alice": true,
			},
			spectatorGuess: 7,
		});
		expect(phase.toJson(charlie.privateId)).toEqual({
			phase: "question",
			questionInfo: {
				question: "What is the answer?",
			},
			guesses: {
				"public-Alice": true,
			},
		});
	});
	
	test("toJson reports round time and end time if option specified", () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		
		const alice = makePlayer("Alice");
		
		const phase = makeQuestionPhase({
			qa: "What is the answer?",
			players: [alice],
			options: { questionPhaseDuration: 60_000 },
		});
		
		expect(phase.toJson(alice.privateId)).toEqual({
			phase: "question",
			questionInfo: {
				question: "What is the answer?",
			},
			guesses: {
				"public-Alice": false,
			},
			roundDuration: 60_000,
			roundEnd: 1_060_300,
		});
	});
	
	test("toJson does not show answer", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		
		const phase = makeQuestionPhase({
			qa: {
				question: "What is the answer?",
				answer: 7,
				source: "Wikipedia",
				date: "2020",
			},
			players: [alice, bob, charlie]
		});
		
		expect(phase.toJson(alice.privateId)).toEqual({
			phase: "question",
			questionInfo: {
				question: "What is the answer?",
				source: "Wikipedia",
				date: "2020",
			},
			guesses: {
				"public-Alice": false,
				"public-Bob": false,
				"public-Charlie": false,
			}
		});
	});
	
	test("getGuesses returns all guesses", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		const derek = makeSpectator("Derek");
		
		const phase = makeQuestionPhase({
			players: [alice, bob, charlie],
			spectators: [derek]
		});
		
		expect(phase.getGuesses()).to.deep.equal([new Map(), new Map()]);
		
		phase.submitGuess(alice.privateId, 42);
		expect(phase.getGuesses()).to.deep.equal([
			new Map([[alice, 42]]),
			new Map(),
		]);
		
		phase.submitGuess(charlie.privateId, 7);
		expect(phase.getGuesses()).to.deep.equal([
			new Map([[alice, 42], [charlie, 7]]),
			new Map(),
		]);
		
		phase.submitGuess(derek.privateId, 100);
		expect(phase.getGuesses()).to.deep.equal([
			new Map([[alice, 42], [charlie, 7]]),
			new Map([[derek, 100]]),
		]);
	});
	
	test("can withdraw guess", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		
		const phase = makeQuestionPhase({
			players: [alice, bob],
		});
		
		phase.submitGuess(alice.privateId, 42);
		expect(phase.getGuesses()).to.deep.equal([
			new Map([[alice, 42]]),
			new Map(),
		]);
		phase.submitGuess(alice.privateId);
		expect(phase.getGuesses()).to.deep.equal([
			new Map(),
			new Map(),
		]);
	});
	
	test("all guesses submitted ends phase when option set", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		// We do not wait for spectators.
		const derek = makeSpectator("Derek");
		const phase = makeQuestionPhase({
			players: [alice, bob, charlie],
			spectators: [derek],
			options: { endQuestionPhaseWhenAllGuessesSubmitted: true },
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
			options: { questionPhaseDuration: 60_000 },
		});
		
		const callback = vi.fn();
		phase.onEndPhase().subscribe(callback);
		
		vi.advanceTimersByTime(60_300);
		expect(callback).toHaveBeenCalled();
	});
});
