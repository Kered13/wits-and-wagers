import { beforeEach, describe, expect, test, vi } from "vitest";

import { BettingPhase, BettingPhaseOptions, DEFAULT_BETTING_PHASE_OPTIONS } from "./betting-phase.js";
import { Player, Spectator } from "../player/player.js";
import { privateId, publicId } from "../player/player-id.js";
import { PlayerManager } from "../player/player-manager.js";
import { type BettingPhaseState } from "../../shared/game/betting-phase.js";
import { BettingResults } from "../../shared/game/intermission-phase.js";


function makePlayer(name: string): Player {
	const player = new Player({
		name: name,
		publicId: publicId(`public-${name}`),
		privateId: privateId(`private-${name}`),
		color: "#FF0000"
	});
	player.chips = 100;
	return player;
};


function makeSpectator(name: string): Spectator {
	const player = new Spectator({
		name: name,
		publicId: publicId(`public-${name}`),
		privateId: privateId(`private-${name}`),
	});
	player.chips = 100;
	return player;
};


function makeBettingPhase(
		obj: {
			guesses: [Player, number][],
			specGuesses?: [Spectator, number][],
			spectators?: Spectator[],
			question?: string,
			answer?: number,
			round?: number,
			options?: Partial<BettingPhaseOptions>
		}): BettingPhase {
	const guesses = obj.guesses;
	const specGuesses = obj.specGuesses ?? [];
	const spectators = obj.spectators ?? [];
	const question = { question: obj.question ?? "What is the answer?", answer: obj.answer ?? 7 };
	const round = obj.round ?? 1;
	const options = Object.assign({}, DEFAULT_BETTING_PHASE_OPTIONS, obj.options);
	return new BettingPhase(
		question,
		new PlayerManager(guesses.map(([player, guess]) => player), spectators),
		new Map(guesses),
		new Map(specGuesses),
		round,
		options);
}


function expectBettingPhaseStateEqual(actual: BettingPhaseState, expected: BettingPhaseState): void {
	expect(expected.phase).to.deep.equal(actual.phase);
	expect(expected.questionInfo).to.deep.equal(actual.questionInfo);
	expect(expected.guesses).to.have.deep.members(actual.guesses);
	expect(expected.bets).to.have.deep.members(actual.bets);
}


describe("BettingPhase", () => {
	test("submitBet deducts chips", () => {
		const alice = makePlayer("Alice");
		
		const phase = makeBettingPhase({ guesses: [[alice, 42]] });
		
		phase.submitBet(alice.privateId, "AllTooHigh", 10);
		phase.submitBet(alice.privateId, 3, 20);
		
		expect(alice.chips).to.equal(70);
	});
	
	test("submitBet deducts chips for spectators", () => {
		const alice = makePlayer("Alice");
		const bob = makeSpectator("Bob");
		
		const phase = makeBettingPhase({ guesses: [[alice, 42]], spectators: [bob] });
		
		phase.submitBet(bob.privateId, "AllTooHigh", 10);
		phase.submitBet(bob.privateId, 3, 20);
		
		expect(bob.chips).to.equal(70);
	});
	
	test("can withdraw a bet", () => {
		const alice = makePlayer("Alice");
		
		const phase = makeBettingPhase({ guesses: [[alice, 42]] });
		
		phase.submitBet(alice.privateId, "AllTooHigh", 1);
		phase.submitBet(alice.privateId, 3, 1);
		expect(() => phase.submitBet(alice.privateId, "AllTooHigh", 0)).not.to.throw();
		expect(() => phase.submitBet(alice.privateId, 3, 0)).not.to.throw();
		
		expect(phase.toJson(alice.privateId).bets).to.be.empty;
	});
	
	test("withdraw bet returns chips", () => {
		const alice = makePlayer("Alice");
		
		const phase = makeBettingPhase({ guesses: [[alice, 42]] });
		phase.submitBet(alice.privateId, "AllTooHigh", 10);
		phase.submitBet(alice.privateId, 3, 20);
		
		expect(alice.chips).to.equal(70);
		
		phase.submitBet(alice.privateId, 3, 0);
		
		expect(alice.chips).to.equal(90);
	});
	
	test("withdraw bet returns chips for spectators", () => {
		const alice = makePlayer("Alice");
		const bob = makeSpectator("Bob");
		
		const phase = makeBettingPhase({ guesses: [[alice, 42]], spectators: [bob] });
		phase.submitBet(bob.privateId, "AllTooHigh", 10);
		phase.submitBet(bob.privateId, 3, 20);
		
		expect(bob.chips).to.equal(70);
		
		phase.submitBet(bob.privateId, 3, 0);
		
		expect(bob.chips).to.equal(90);
	});
	
	test("can replace bet", () => {
		const alice = makePlayer("Alice");
		
		const phase = makeBettingPhase({ guesses: [[alice, 42]] });
		phase.submitBet(alice.privateId, 3, 60);
		
		expect(alice.chips).to.equal(40);
		
		phase.submitBet(alice.privateId, 3, 70);
		
		expect(alice.chips).to.equal(30);
		expect(phase.toJson(alice.privateId).bets).to.deep.equal([{
			player: alice.publicId,
			target: 3,
			wager: 70,
		}]);
	});
	
	test("player not in game cannot bet", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		
		const phase = makeBettingPhase({ guesses: [[alice, 42]] });
		
		expect(() => phase.submitBet(bob.privateId, "AllTooHigh", 1)).to.throw();
	});
	
	describe("invalid bets throw", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		const derek = makePlayer("Derek");
		let phase: BettingPhase;
		
		// Reset the phase before each test.
		beforeEach(() => {
			phase = makeBettingPhase({ guesses: [[alice, 42], [bob, 13], [charlie, 7], [derek, 60]] });
		});
		
		test("cannot wager more than chips", () => {
			expect(() => phase.submitBet(alice.privateId, "AllTooHigh", 101)).to.throw();
			
			phase.submitBet(alice.privateId, "AllTooHigh", 60);
			expect(() => phase.submitBet(alice.privateId, "Red", 60)).to.throw();
		});
		
		test("cannot wager negative", () => {
			expect(() => phase.submitBet(alice.privateId, "AllTooHigh", -1)).to.throw();
		});
		
		test("cannot wager non-integer", () => {
			expect(() => phase.submitBet(alice.privateId, "AllTooHigh", 0.5)).to.throw();
		});
		
		test("cannot bet on unavailable", () => {
			expect(() => phase.submitBet(alice.privateId, 3, 1)).to.throw();
		});
		
		test("cannot place more than two bets", () => {
			phase.submitBet(alice.privateId, "AllTooHigh", 1);
			phase.submitBet(alice.privateId, "Black", 1);
			expect(() => phase.submitBet(alice.privateId, "Red", 1)).to.throw();
		});
	});
	
	test("toJson is same for all players", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		const derek = makePlayer("Derek");
		
		const phase = makeBettingPhase({
			question: "What is the question?",
			answer: 42,
			round: 1,
			guesses: [[alice, 42], [bob, 13], [charlie, 7], [derek, 60]]
		});
		
		phase.submitBet(alice.privateId, "AllTooHigh", 37);
		phase.submitBet(bob.privateId, "Red", 10);
		phase.submitBet(charlie.privateId, "Black", 50);
		phase.submitBet(derek.privateId, 2, 60);
		
		const expected: BettingPhaseState = {
			phase: "betting",
			questionInfo: {
				question: "What is the question?",
			},
			guesses: [
				{ player: publicId("public-Alice"), target: 4, guess: 42 },
				{ player: publicId("public-Bob"), target: 2, guess: 13 },
				{ player: publicId("public-Charlie"), target: 1, guess: 7 },
				{ player: publicId("public-Derek"), target: 5, guess: 60 }
			],
			bets: [
				{ player: publicId("public-Alice"), target: "AllTooHigh", wager: 37 },
				{ player: publicId("public-Bob"), target: "Red", wager: 10 },
				{ player: publicId("public-Charlie"), target: "Black", wager: 50 },
				{ player: publicId("public-Derek"), target: 2, wager: 60 },
			],
			spectatorBets: [],
		};
		
		expectBettingPhaseStateEqual(phase.toJson(alice.privateId), expected);
		expectBettingPhaseStateEqual(phase.toJson(bob.privateId), expected);
		expectBettingPhaseStateEqual(phase.toJson(charlie.privateId), expected);
		expectBettingPhaseStateEqual(phase.toJson(derek.privateId), expected);
	});
	
	test("toJson reports only spectator bet for one self", () => {
		const alice = makePlayer("Alice");
		const bob = makeSpectator("Bob");
		const charlie = makeSpectator("Charlie");
		
		const phase = makeBettingPhase({
			question: "What is the question?",
			answer: 42,
			round: 1,
			guesses: [[alice, 42]],
			spectators: [bob, charlie],
		});
		
		phase.submitBet(alice.privateId, "AllTooHigh", 37);
		phase.submitBet(bob.privateId, "Red", 10);
		phase.submitBet(charlie.privateId, "Black", 50);
		
		const baseExpected: BettingPhaseState = {
			phase: "betting",
			questionInfo: {
				question: "What is the question?",
			},
			guesses: [
				{ player: publicId("public-Alice"), target: 3, guess: 42 },
			],
			bets: [
				{ player: publicId("public-Alice"), target: "AllTooHigh", wager: 37 },
			],
			spectatorBets: [],
		};
		
		const aliceExpected: BettingPhaseState = {
			...baseExpected,
			spectatorBets: [],
		};
		expectBettingPhaseStateEqual(phase.toJson(alice.privateId), aliceExpected);
		
		const bobExpected: BettingPhaseState = {
			...baseExpected,
			spectatorBets: [
				{ player: publicId("public-Bob"), target: "Red", wager: 10 },
			],
		};
		expectBettingPhaseStateEqual(phase.toJson(bob.privateId), bobExpected);
		
		const charlieExpected: BettingPhaseState = {
			...baseExpected,
			spectatorBets: [
				{ player: publicId("public-Charlie"), target: "Black", wager: 50 },
			],
		};
		expectBettingPhaseStateEqual(phase.toJson(charlie.privateId), charlieExpected);
	});
	
	test("toJson reports round time and end time if option specified", () => {
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		
		const alice = makePlayer("Alice");
		
		const phase = makeBettingPhase({
			question: "What is the question?",
			answer: 42,
			round: 1,
			guesses: [[alice, 42]],
			options: { bettingPhaseDuration: 60_000 },
		});
		
		expect(phase.toJson(alice.privateId)).to.deep.equal({
			phase: "betting",
			questionInfo: {
				question: "What is the question?",
			},
			guesses: [
				{ player: "public-Alice", target: 3, guess: 42 },
			],
			bets: [],
			spectatorBets: [],
			roundDuration: 60_000,
			roundEnd: 1_060_300
		});
	});
	
	test("endPhase notifies subscribers", () => {
		const alice = makePlayer("Alice");
		const phase = makeBettingPhase({ guesses: [[alice, 42]] });
		
		const callback = vi.fn();
		phase.onEndPhase().subscribe(callback);
		phase.endPhase();
		
		expect(callback).toHaveBeenCalled();
	});
	
	test("endPhase is idempotent", () => {
		const alice = makePlayer("Alice");
		const phase = makeBettingPhase({ guesses: [[alice, 42]] });

		phase.endPhase();
		
		const callback = vi.fn();
		phase.onEndPhase().subscribe(callback);
		phase.endPhase();
		
		expect(callback).not.toHaveBeenCalled();
	});
	
	test("endPhase called after timeout", () => {
		vi.useFakeTimers();
		
		const alice = makePlayer("Alice");
		const phase = makeBettingPhase({
			guesses: [[alice, 42]],
			options: { bettingPhaseDuration: 60_000 }
		});
		
		const callback = vi.fn();
		phase.onEndPhase().subscribe(callback);
		
		vi.advanceTimersByTime(60_300);
		expect(callback).toHaveBeenCalled();
	});
	
	describe("bets on ties are normalized to best payout", () => {
		test("normalized down", () => {
			const alice = makePlayer("Alice");
			const bob = makePlayer("Bob");
			const charlie = makePlayer("Charlie");
			const derek = makePlayer("Derek");
			const elizabeth = makePlayer("Elizabeth");
			
			// Four-way tie. They will pay out 4x, 3x, 2x, 3x respectively.
			const phase = makeBettingPhase({
				guesses: [[alice, 42], [bob, 42], [charlie, 42], [derek, 42], [elizabeth, 52]],
				answer: 50,
				round: 5,
			});
			
			// All bets should be normalized to 4x.
			phase.submitBet(alice.privateId, 1, 10);
			phase.submitBet(bob.privateId, 2, 10);
			phase.submitBet(charlie.privateId, 3, 10);
			phase.submitBet(derek.privateId, 4, 10);
			
			const expectedConclusion: BettingResults = {
				winners: [alice.publicId, bob.publicId, charlie.publicId, derek.publicId],
				earnings: {
					[alice.publicId]: 5 + 5*10,
					[bob.publicId]: 5 + 5*10,
					[charlie.publicId]: 5 + 5*10,
					[derek.publicId]: 5 + 5*10,
					[elizabeth.publicId]: 0,
				},
			};
			
			expect(phase.resolve().players).to.deep.equal(expectedConclusion);
		});
		
		test("normalized up", () => {
			const alice = makePlayer("Alice");
			const bob = makePlayer("Bob");
			const charlie = makePlayer("Charlie");
			const derek = makePlayer("Derek");
			const elizabeth = makePlayer("Elizabeth");
			
			// Four-way tie. They will pay out 3x, 2x, 3x, 4x respectively.
			const phase = makeBettingPhase({
				guesses: [[alice, 42], [bob, 52], [charlie, 52], [derek, 52], [elizabeth, 52]],
				answer: 60,
				round: 5,
			});
			
			// All bets should be normalized to 4x.
			phase.submitBet(alice.privateId, 2, 10);
			phase.submitBet(bob.privateId, 3, 10);
			phase.submitBet(charlie.privateId, 4, 10);
			phase.submitBet(derek.privateId, 5, 10);
			
			const expectedConclusion: BettingResults = {
				winners: [bob.publicId, charlie.publicId, derek.publicId, elizabeth.publicId],
				earnings: {
					[alice.publicId]: 5 * 10,
					[bob.publicId]: 5 + 5 * 10,
					[charlie.publicId]: 5 + 5 * 10,
					[derek.publicId]: 5 + 5 * 10,
					[elizabeth.publicId]: 5,
				},
			};
			
			expect(phase.resolve().players).to.deep.equal(expectedConclusion);
		});
	});
	
	describe("resolve pays out bets", () => {
		test("exact guess wins", () => {
			const alice = makePlayer("Alice");
			const phase = makeBettingPhase({
				answer: 42,
				round: 3,
				guesses: [[alice, 42]],
			});
			
			phase.submitBet(alice.privateId, "AllTooHigh", 10);
			phase.submitBet(alice.privateId, 3, 15);
			const conclusion = phase.resolve();
			
			expect(conclusion).to.deep.equal({
				type: "conclusion",
				players: {
					winners: [alice.publicId],
					earnings: {
						[alice.publicId]: 3*15 + 1 + 3
					},
				},
				spectators: {
					winners: [],
					earnings: {},
				},
			});
			
			// Alice wins 2x her bet on 0 and loses her bet on AllTooHigh, but
			// gets her reserved chip back and gets the round bonus chips.
			expect(alice.chips).to.equal(100 + 2*15 - 10 + 1 + 3);
		});
		
		test("guess one over answer loses", () => {
			const alice = makePlayer("Alice");
			const phase = makeBettingPhase({
				answer: 42,
				round: 3,
				guesses: [[alice, 43]],
			});
			
			phase.submitBet(alice.privateId, "AllTooHigh", 10);
			phase.submitBet(alice.privateId, 3, 15);
			const conclusion = phase.resolve();
			
			expect(conclusion).to.deep.equal({
				type: "conclusion",
				players: {
					winners: [],
					earnings: {
						[alice.publicId]: 7 * 10 + 1
					},
				},
				spectators: {
					winners: [],
					earnings: {},
				},
			});
			
			// Alice wins 6x her bet on AllTooHigh and loses her bet on 0, but
			// gets her reserved chip back.
			expect(alice.chips).to.equal(100 + 6*10 - 15 + 1);
		});
		
		test("guess order is irrelevent", () => {
			const alice = makePlayer("Alice");
			const bob = makePlayer("Bob");
			const charlie = makePlayer("Charlie");
			const derek = makePlayer("Derek");
			
			// Guesses are sent in a "scrambled" order. Alice's guess still
			// wins.
			const phase = makeBettingPhase({
				answer: 42,
				round: 3,
				guesses: [[charlie, 30], [derek, 50], [bob, 60], [alice, 40]],
			});
			
			phase.submitBet(alice.privateId, 1, 10);
			phase.submitBet(bob.privateId, 2, 10);
			phase.submitBet(charlie.privateId, 4, 10);
			phase.submitBet(derek.privateId, 5, 10);
			phase.resolve();
			
			// Alice loses her bet but gets her reserved chips back and wins the
			// round bonus chips.
			expect(alice.chips).to.equal(100 - 10 + 2 + 3);
			// Bob wins 3x on his bet.
			expect(bob.chips).to.equal(100 + 3*10);
			// Charlie loses his bet but gets his reserved chips back.
			expect(charlie.chips).to.equal(100 - 10 + 2);
			// Derek loses his bet but gets his reserved chips back.
			expect(derek.chips).to.equal(100 - 10 + 2);
		});
		
		test("ties pay out bonus chips to all players", () => {
			const alice = makePlayer("Alice");
			const bob = makePlayer("Bob");
			const charlie = makePlayer("Charlie");
			const derek = makePlayer("Derek");
			const elizabeth = makePlayer("Elizabeth");
			const phase = makeBettingPhase({
				answer: 52,
				round: 3,
				guesses: [[alice, 50], [bob, 50], [charlie, 50], [derek, 50], [elizabeth, 60]],
			});
			
			const conclusion = phase.resolve();
			
			expect(conclusion).to.deep.equal({
				type: "conclusion",
				players: {
					winners: [alice.publicId, bob.publicId, charlie.publicId, derek.publicId],
					earnings: {
						[alice.publicId]: 3,
						[bob.publicId]: 3,
						[charlie.publicId]: 3,
						[derek.publicId]: 3,
						[elizabeth.publicId]: 0,
					},
				},
				spectators: {
					winners: [],
					earnings: {},
				},
			});
			
			// No one bets, but the four-way tie pays out the round bonus to all
			// winning players.
			expect(alice.chips).to.equal(100 + 3);
			expect(bob.chips).to.equal(100 + 3);
			expect(charlie.chips).to.equal(100 + 3);
			expect(derek.chips).to.equal(100 + 3);
			expect(elizabeth.chips).to.equal(100);
		});
		
		test("handles winning bets on ties", () => {
			const alice = makePlayer("Alice");
			const bob = makePlayer("Bob");
			const charlie = makePlayer("Charlie");
			const derek = makePlayer("Derek");
			const elizabeth = makePlayer("Elizabeth");
			const phase = makeBettingPhase({
				answer: 52,
				round: 3,
				guesses: [[alice, 40], [bob, 50], [charlie, 50], [derek, 50], [elizabeth, 60]],
			});
			
			phase.submitBet(alice.privateId, 2, 10);
			phase.submitBet(bob.privateId, 3, 10);
			phase.submitBet(charlie.privateId, 4, 10);
			
			const conclusion = phase.resolve();
			
			expect(conclusion).to.deep.equal({
				type: "conclusion",
				players: {
					winners: [bob.publicId, charlie.publicId, derek.publicId],
					earnings: {
						[alice.publicId]: 4*10,
						[bob.publicId]: 4*10 + 3,
						[charlie.publicId]: 4*10 + 3,
						[derek.publicId]: 3,
						[elizabeth.publicId]: 0,
					},
				},
				spectators: {
					winners: [],
					earnings: {},
				},
			});
			
			// Alice wins 3x her bet on 1.
			expect(alice.chips).to.equal(100 + 3*10);
			// Bob wins 3x his bet on 1, and wins the round bonus chips.
			expect(bob.chips).to.equal(100 + 3*10 + 3);
			// Charlie wins 3x his bet on 1, and wins the round bonus chips.
			expect(charlie.chips).to.equal(100 + 3*10 + 3);
			// Derek wins the round bonus chips.
			expect(derek.chips).to.equal(100 + 3);
			// Elizabeth placed no bets.
			expect(elizabeth.chips).to.equal(100);
		});
		
		test("both red and black can win on ties", () => {
			const alice = makePlayer("Alice");
			const bob = makePlayer("Bob");
			const charlie = makePlayer("Charlie");
			const derek = makePlayer("Derek");
			const elizabeth = makePlayer("Elizabeth");
			const phase = makeBettingPhase({
				answer: 52,
				round: 3,
				guesses: [[alice, 40], [bob, 50], [charlie, 50], [derek, 50], [elizabeth, 60]],
			});
			
			phase.submitBet(alice.privateId, "Red", 10);
			phase.submitBet(elizabeth.privateId, "Black", 10);
			
			phase.resolve();
			
			// Alice wins 1x her bet on Red.
			expect(alice.chips).to.equal(100 + 1*10);
			// Bob wins the round bonus chips.
			expect(bob.chips).to.equal(100 + 3);
			// Charlie wins the round bonus chips.
			expect(charlie.chips).to.equal(100 + 3);
			// Derek wins the round bonus chips.
			expect(derek.chips).to.equal(100 + 3);
			// Elizabeth wins 1x her bet on Black.
			expect(elizabeth.chips).to.equal(100 + 1*10);
		});
		
		test("returns correct number of reserved chips", () => {
			const alice = makePlayer("Alice");
			const bob = makePlayer("Bob");
			const charlie = makePlayer("Charlie");
			const derek = makePlayer("Derek");
			const phase = makeBettingPhase({
				answer: 42,
				round: 3,
				guesses: [[alice, 50], [bob, 60], [charlie, 70], [derek, 80]],
			});
			
			phase.submitBet(alice.privateId, 1, 10);
			phase.submitBet(alice.privateId, 2, 10);
			phase.submitBet(bob.privateId, 2, 20);
			phase.submitBet(charlie.privateId, 4, 10);
			phase.submitBet(charlie.privateId, "AllTooHigh", 10);
			phase.submitBet(derek.privateId, 5, 1);
			
			phase.resolve();
			
			// Alice loses both of her bets, but gets both reserved chips back.
			expect(alice.chips).to.equal(100 - 10 - 10 + 2);
			// Bob loses his bet, but gets both reserved chips back.
			expect(bob.chips).to.equal(100 - 20 + 2);
			// Charlie wins 6x on his bet on AllTooHigh and loses his bet on 2,
			// but gets his reserved chip back.
			expect(charlie.chips).to.equal(100 + 6*10 - 10 + 1);
			// Derek loses his bet, but gets one reserved chip back because he
			// only wagered 1.
			expect(derek.chips).to.equal(100);
		});
		
		describe("one player", () => {
			test("pays out AllTooHigh", () => {
				const alice = makePlayer("Alice");
				const phase = makeBettingPhase({
					answer: 42,
					round: 3,
					guesses: [[alice, 50]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				
				phase.resolve();
				
				// Alice wins 6x her bet.
				expect(alice.chips).to.equal(100 + 6*10);
			});
			
			test("pays out winning bet", () => {
				const alice = makePlayer("Alice");
				const phase = makeBettingPhase({
					answer: 42,
					round: 3,
					guesses: [[alice, 40]],
				});
				
				phase.submitBet(alice.privateId, 3, 10);
				
				phase.resolve();
				
				// Alice wins 2x her bet and get the round bonus chips.
				expect(alice.chips).to.equal(100 + 2*10 + 3);
			});
			
			test("AllTooHigh does not pay out color", () => {
				const alice = makePlayer("Alice");
				const phase = makeBettingPhase({
					answer: 42,
					round: 3,
					guesses: [[alice, 50]],
				});
				
				phase.submitBet(alice.privateId, "Black", 10);
				phase.submitBet(alice.privateId, "Red", 10);
				
				phase.resolve();
				
				// Alice loses her bet, but gets her reserved chips back.
				expect(alice.chips).to.equal(100 - 10 - 10 + 2);
			});
			
			test("Winning bet does not pay out color", () => {
				const alice = makePlayer("Alice");
				const phase = makeBettingPhase({
					answer: 42,
					round: 3,
					guesses: [[alice, 40]],
				});
				
				phase.submitBet(alice.privateId, "Black", 10);
				phase.submitBet(alice.privateId, "Red", 10);
				
				phase.resolve();
				
				// Alice loses her bet, but gets her reserved chips back and the
				// round bonus chips.
				expect(alice.chips).to.equal(100 - 10 - 10 + 2 + 3);
			});
		});
		
		describe("two players", () => {
			test("pays out AllTooHigh", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const phase = makeBettingPhase({
					answer: 32,
					round: 3,
					guesses: [[alice, 40], [bob, 50]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, 2, 15);
				phase.submitBet(bob.privateId, "Red", 10);
				phase.submitBet(bob.privateId, "Black", 15);
				
				phase.resolve();
				
				// Alice wins 6x her bet on AllTooHigh and loses her bet on 0,
				// but gets her reserved chip back.
				expect(alice.chips).to.equal(100 + 6*10 - 15 + 1);
				// Both loses both of his bets, but gets his reserved chips
				// back.
				expect(bob.chips).to.equal(77);
			});
			
			test("pays out when first guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const phase = makeBettingPhase({
					answer: 42,
					round: 3,
					guesses: [[alice, 40], [bob, 50]],
				});
				
				phase.submitBet(alice.privateId, 2, 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 4, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				
				phase.resolve();
				
				// Alice wins 3x on her bet on 0, 1x on her bet on Red, and wins
				// the round bonus chips.
				expect(alice.chips).to.equal(100 + 3*10 + 1*15 + 3);
				// Bob loses both of his bets, but gets his reserved chips back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
			});
			
			test("pays out when second guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const phase = makeBettingPhase({
					answer: 52,
					round: 3,
					guesses: [[alice, 50], [bob, 40]],
				});
				
				phase.submitBet(alice.privateId, 2, 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 4, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back and wins the round bonus chips.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2 + 3);
				// Bob wins 3x on his bet on 1 and 1x on his bet on Black.
				expect(bob.chips).to.equal(100 + 3*10 + 1*15);
			});
			
			test("pays out when third guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const phase = makeBettingPhase({
					answer: 52,
					round: 3,
					guesses: [[alice, 50], [bob, 40]],
				});
				
				phase.submitBet(alice.privateId, 2, 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 4, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back and wins the round bonus chips.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2 + 3);
				// Bob wins 3x on his bet on 1 and 1x on his bet on Black.
				expect(bob.chips).to.equal(100 + 3*10 + 1*15);
			});
		});
		
		describe("three players", () => {
			test("pays out AllTooHigh", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const phase = makeBettingPhase({
					answer: 32,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, 2, 15);
				phase.submitBet(bob.privateId, "Red", 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 3, 10);
				phase.submitBet(charlie.privateId, 4, 15);
				
				phase.resolve();
				
				// Alice wins 6x her bet on AllTooHigh and loses her bet on 0,
				// but gets her reserved chip back.
				expect(alice.chips).to.equal(100 + 6*10 - 15 + 1);
				// Both loses both of his bets, but gets his reserved chips back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie loses both of his bets, but gets his reserved chips back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
			});
			
			test("pays out when first guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const phase = makeBettingPhase({
					answer: 42,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 3, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 2, 10);
				phase.submitBet(charlie.privateId, 4, 15);
				
				phase.resolve();
				
				// Alice wins 1x her bet on Red and loses her bet on AllTooHigh,
				// but gets her reserved chip back and the round bonus chips.
				expect(alice.chips).to.equal(100 + 1*15 - 10 + 1 + 3);
				// Bob loses both of his bets, but gets his reserved chips back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie wins 3x his bet on 0 and loses his bet on 2, but
				// gets his reserved chip back.
				expect(charlie.chips).to.equal(100 + 3*10 - 15 + 1);
			});
			
			test("pays out when second guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const phase = makeBettingPhase({
					answer: 52,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 3, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 2, 10);
				phase.submitBet(charlie.privateId, 4, 15);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob wins 2x on his bet on 1 and loses his bet on Black, but
				// gets his reserved chip back and wins the round bonus chips.
				expect(bob.chips).to.equal(100 + 2*10 - 15 + 1 + 3);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
			});
			
			test("pays out when third guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const phase = makeBettingPhase({
					answer: 62,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 3, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 2, 10);
				phase.submitBet(charlie.privateId, 4, 15);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob wins 1x his bet on Black and loses his bet on 1, but gets
				// his reserved chip back.
				expect(bob.chips).to.equal(100 + 1*15 - 10 + 1);
				// Charlie wins 3x his bet on 2 and loses his bet on 0, but
				// gets his reserved chip back and wins the round bonus chips.
				expect(charlie.chips).to.equal(100 + 3*15 - 10 + 1 + 3);
			});
		});
		
		describe("four players", () => {
			test("pays out AllTooHigh", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const phase = makeBettingPhase({
					answer: 32,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, 1, 15);
				phase.submitBet(bob.privateId, "Red", 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 2, 10);
				phase.submitBet(charlie.privateId, 4, 15);
				phase.submitBet(derek.privateId, 5, 20);
				
				phase.resolve();
				
				// Alice wins 6x her bet on AllTooHigh and loses her bet on 0,
				// but gets her reserved chip back.
				expect(alice.chips).to.equal(100 + 6*10 - 15 + 1);
				// Both loses both of his bets, but gets his reserved chips
				// back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie loses both of his, but gets his reserved chips back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
			});
			
			test("pays out when first guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const phase = makeBettingPhase({
					answer: 42,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 2, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 1, 10);
				phase.submitBet(charlie.privateId, 4, 15);
				phase.submitBet(derek.privateId, 5, 20);
				
				phase.resolve();
				
				// Alice wins 1x her bet on Red and loses her bet on AllTooHigh,
				// but gets her reserved chip back and the round bonus chips.
				expect(alice.chips).to.equal(100 + 1*15 - 10 + 1 + 3);
				// Bob loses both of his bets, but gets his reserved chips back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie wins 4x his bet on 0 and loses his bet on 2, but
				// gets his reserved chip back.
				expect(charlie.chips).to.equal(100 + 4*10 - 15 + 1);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
			});
			
			test("pays out when second guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const phase = makeBettingPhase({
					answer: 52,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 2, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 1, 10);
				phase.submitBet(charlie.privateId, 4, 15);
				phase.submitBet(derek.privateId, 5, 20);
				
				phase.resolve();
				
				// Alice wins 1x her bet on Red and loses her bet on
				// AllTooHigh, but gets her reserved chip back.
				expect(alice.chips).to.equal(100 + 1*15 - 10 + 1);
				// Bob wins 3x on his bet on 1 and loses his bet on Black, but
				// gets his reserved chip back and wins the round bonus chips.
				expect(bob.chips).to.equal(100 + 3*10 - 15 + 1 + 3);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chip2 back.
				expect(derek.chips).to.equal(100 - 20 + 2);
			});
			
			test("pays out when third guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const phase = makeBettingPhase({
					answer: 62,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 2, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 1, 10);
				phase.submitBet(charlie.privateId, 4, 15);
				phase.submitBet(derek.privateId, 5, 20);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob wins 1x his bet on Black and loses his bet on 1, but gets
				// his reserved chip back.
				expect(bob.chips).to.equal(100 + 1*15 - 10 + 1);
				// Charlie wins 3x his bet on 2 and loses his bet on 0, but
				// gets his reserved chip back and wins the round bonus chips.
				expect(charlie.chips).to.equal(100 + 3*15 - 10 + 1 + 3);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
			});
			
			test("pays out when fourth guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const phase = makeBettingPhase({
					answer: 72,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 2, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 1, 10);
				phase.submitBet(charlie.privateId, 4, 15);
				phase.submitBet(derek.privateId, 5, 20);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob wins 1x his bet on Black and loses his bet on 1, but gets
				// his reserved chip back.
				expect(bob.chips).to.equal(100 + 1*15 - 10 + 1);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek wins 4x his bet on 3, and wins the round bonus chips.
				expect(derek.chips).to.equal(100 + 4*20 + 3);
			});
		});
		
		describe("five players", () => {
			test("pays out AllTooHigh", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const phase = makeBettingPhase({
					answer: 32,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, 1, 15);
				phase.submitBet(bob.privateId, "Red", 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 2, 10);
				phase.submitBet(charlie.privateId, 3, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 3, 25);
				
				phase.resolve();
				
				// Alice wins 6x her bet on AllTooHigh and loses her bet on 0,
				// but gets her reserved chip back.
				expect(alice.chips).to.equal(100 + 6*10 - 15 + 1);
				// Both loses both of his bets, but gets his reserved chips
				// back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie loses both of his, but gets his reserved chips back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
			});
			
			test("pays out when first guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const phase = makeBettingPhase({
					answer: 42,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 2, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 1, 10);
				phase.submitBet(charlie.privateId, 3, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 3, 25);
				
				phase.resolve();
				
				// Alice wins 1x her bet on Red and loses her bet on AllTooHigh,
				// but gets her reserved chip back and the round bonus chips.
				expect(alice.chips).to.equal(100 + 1*15 - 10 + 1 + 3);
				// Bob loses both of his bets, but gets his reserved chips back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie wins 4x his bet on 0 and loses his bet on 2, but
				// gets his reserved chip back.
				expect(charlie.chips).to.equal(100 + 4*10 - 15 + 1);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
			});
			
			test("pays out when second guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const phase = makeBettingPhase({
					answer: 52,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 2, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 1, 10);
				phase.submitBet(charlie.privateId, 3, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 3, 25);
				
				phase.resolve();
				
				// Alice wins 1x her bet on Red and loses her bet on
				// AllTooHigh, but gets her reserved chip back.
				expect(alice.chips).to.equal(100 + 1*15 - 10 + 1);
				// Bob wins 3x on his bet on 1 and loses his bet on Black, but
				// gets his reserved chip back and wins the round bonus chips.
				expect(bob.chips).to.equal(100 + 3*10 - 15 + 1 + 3);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
			});
			
			test("pays out when third guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const phase = makeBettingPhase({
					answer: 62,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 2, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 1, 10);
				phase.submitBet(charlie.privateId, 3, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 3, 25);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob loses both of his bets, but gets his reserved chip back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie wins 2x his bet on 2 and loses his bet on 0, but
				// gets his reserved chip back and wins the round bonus chips.
				expect(charlie.chips).to.equal(100 + 2*15 - 10 + 1 + 3);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth wins 2x her bet on 2 and loses her bet on 4, but
				// gets her reserved chip back.
				expect(elizabeth.chips).to.equal(100 + 2*25 - 5 + 1);
			});
			
			test("pays out when fourth guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const phase = makeBettingPhase({
					answer: 72,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 2, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 1, 10);
				phase.submitBet(charlie.privateId, 3, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 3, 25);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob wins 1x his bet on Black and loses his bet on 1, but gets
				// his reserved chip back.
				expect(bob.chips).to.equal(100 + 1*15 - 10 + 1);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek wins 3x his bet on 3, and wins the round bonus chips.
				expect(derek.chips).to.equal(100 + 3*20 + 3);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
			});
			
			test("pays out when fifth guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const phase = makeBettingPhase({
					answer: 82,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 2, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 1, 10);
				phase.submitBet(charlie.privateId, 3, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 3, 25);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob wins 1x his bet on Black and loses his bet on 1, but gets
				// his reserved chip back.
				expect(bob.chips).to.equal(100 + 1*15 - 10 + 1);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth wins 4x her bet on 4 and loses her bet on 2, but
				// gets her reserved chip back and wins the round bonus chips.
				expect(elizabeth.chips).to.equal(100 + 4*5 - 25 + 1 + 3);
			});
		});
		
		describe("six players", () => {
			test("pays out AllTooHigh", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const phase = makeBettingPhase({
					answer: 32,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, 0, 15);
				phase.submitBet(bob.privateId, "Red", 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 1, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 4, 20);
				
				phase.resolve();
				
				// Alice wins 6x her bet on AllTooHigh and loses her bet on 0,
				// but gets her reserved chip back.
				expect(alice.chips).to.equal(100 + 6*10 - 15 + 1);
				// Both loses both of his bets, but gets his reserved chips
				// back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie loses both of his, but gets his reserved chips back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
				// Frieren loses both of her bets, but gets her reserved chips
				// back.
				expect(frieren.chips).to.equal(100 - 15 - 20 + 2);
			});
			
			test("pays out when first guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const phase = makeBettingPhase({
					answer: 42,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 4, 20);
				
				phase.resolve();
				
				// Alice wins 1x her bet on Red and loses her bet on AllTooHigh,
				// but gets her reserved chip back and the round bonus chips.
				expect(alice.chips).to.equal(100 + 1*15 - 10 + 1 + 3);
				// Bob loses both of his bets, but gets his reserved chips back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie wins 5x his bet on 0 and loses his bet on 2, but
				// gets his reserved chip back.
				expect(charlie.chips).to.equal(100 + 5*10 - 15 + 1);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
				// Frieren loses both of her bets, but gets her reserved chips
				// back.
				expect(frieren.chips).to.equal(100 - 15 - 20 + 2);
			});
			
			test("pays out when second guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const phase = makeBettingPhase({
					answer: 52,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 4, 20);
				
				phase.resolve();
				
				// Alice wins 1x her bet on Red and loses her bet on
				// AllTooHigh, but gets her reserved chip back.
				expect(alice.chips).to.equal(100 + 1*15 - 10 + 1);
				// Bob wins 4x on his bet on 1 and loses his bet on Black, but
				// gets his reserved chip back and wins the round bonus chips.
				expect(bob.chips).to.equal(100 + 4*10 - 15 + 1 + 3);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
				// Frieren loses both of her bets, but gets her reserved chips
				// back.
				expect(frieren.chips).to.equal(100 - 15 - 20 + 2);
			});
			
			test("pays out when third guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const phase = makeBettingPhase({
					answer: 62,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 4, 20);
				
				phase.resolve();
				
				// Alice wins 1x her bet on Red and loses her bet on,
				// AllTooHigh, but gets her reserved chips back.
				expect(alice.chips).to.equal(100 + 1*15 - 10 + 1);
				// Bob loses both of his bets, but gets his reserved chips back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie wins 3x his bet on 2 and loses his bet on 0, but
				// gets his reserved chip back and wins the round bonus chips.
				expect(charlie.chips).to.equal(100 + 3*15 - 10 + 1 + 3);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth wins 3x her bet on 2 and loses her bet on 4, but
				// gets her reserved chip back.
				expect(elizabeth.chips).to.equal(100 + 3*25 - 5 + 1);
				// Frieren loses both of her bets, but gets her reserved chips
				// back.
				expect(frieren.chips).to.equal(100 - 15 - 20 + 2);
			});
			
			test("pays out when fourth guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const phase = makeBettingPhase({
					answer: 72,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 4, 20);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob wins 1x his bet on Black and loses his bet on 1, but gets
				// his reserved chip back.
				expect(bob.chips).to.equal(100 + 1*15 - 10 + 1);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek wins 3x his bet on 3, and wins the round bonus chips.
				expect(derek.chips).to.equal(100 + 3*20 + 3);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
				// Frieren wins 3x her bet on 3 and loses her bet on 5, but gets
				// her reserved chips back.
				expect(frieren.chips).to.equal(100 + 3*20 - 15 + 1);
			});
			
			test("pays out when fifth guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const phase = makeBettingPhase({
					answer: 82,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 4, 20);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob wins 1x his bet on Black and loses his bet on 1, but gets
				// his reserved chip back.
				expect(bob.chips).to.equal(100 + 1*15 - 10 + 1);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth wins 4x her bet on 4 and loses her bet on 2, but
				// gets her reserved chip back and wins the round bonus chips.
				expect(elizabeth.chips).to.equal(100 + 4*5 - 25 + 1 + 3);
				// Frieren loses both of her bets, but gets her reserved chips
				// back.
				expect(frieren.chips).to.equal(100 - 15 - 20 + 2);
			});
			
			test("pays out when sixth guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const phase = makeBettingPhase({
					answer: 92,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 4, 20);
				phase.submitBet(elizabeth.privateId, 5, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 4, 20);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob wins 1x his bet on Black and loses his bet on 1, but gets
				// his reserved chip back.
				expect(bob.chips).to.equal(100 + 1*15 - 10 + 1);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
				// Frieren wins 5x her bet on 5 and loses her bet on 3, but gets
				// her reserved chip back and wins the round bonus chips.
				expect(frieren.chips).to.equal(100 + 5*15 - 20 + 1 + 3);
			});
		});
		
		describe("seven players", () => {
			test("pays out AllTooHigh", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const george = makePlayer("George");
				const phase = makeBettingPhase({
					answer: 32,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90], [george, 100]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, 0, 15);
				phase.submitBet(bob.privateId, "Red", 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 1, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 3, 20);
				phase.submitBet(elizabeth.privateId, 4, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 3, 20);
				phase.submitBet(george.privateId, "Black", 15);
				phase.submitBet(george.privateId, 6, 15);
				
				phase.resolve();
				
				// Alice wins 6x her bet on AllTooHigh and loses her bet on 0,
				// but gets her reserved chip back.
				expect(alice.chips).to.equal(100 + 6*10 - 15 + 1);
				// Both loses both of his bets, but gets his reserved chips
				// back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie loses both of his, but gets his reserved chips back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
				// Frieren loses both of her bets, but gets her reserved chips
				// back.
				expect(frieren.chips).to.equal(100 - 15 - 20 + 2);
				// George loses both of his bets, but gets his reserved chips
				// back.
				expect(george.chips).to.equal(100 - 15 - 15 + 2);
			});
			
			test("pays out when first guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const george = makePlayer("George");
				const phase = makeBettingPhase({
					answer: 42,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90], [george, 100]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 3, 20);
				phase.submitBet(elizabeth.privateId, 4, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 3, 20);
				phase.submitBet(george.privateId, "Black", 15);
				phase.submitBet(george.privateId, 6, 15);
				
				phase.resolve();
				
				// Alice wins 1x her bet on Red and loses her bet on AllTooHigh,
				// but gets her reserved chip back and the round bonus chips.
				expect(alice.chips).to.equal(100 + 1*15 - 10 + 1 + 3);
				// Bob loses both of his bets, but gets his reserved chips back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie wins 5x his bet on 0 and loses his bet on 2, but
				// gets his reserved chip back.
				expect(charlie.chips).to.equal(100 + 5*10 - 15 + 1);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
				// Frieren loses both of her bets, but gets her reserved chips
				// back.
				expect(frieren.chips).to.equal(100 - 15 - 20 + 2);
				// George loses both of his bets, but gets his reserved chips
				// back.
				expect(george.chips).to.equal(100 - 15 - 15 + 2);
			});
			
			test("pays out when second guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const george = makePlayer("George");
				const phase = makeBettingPhase({
					answer: 52,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90], [george, 100]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 3, 20);
				phase.submitBet(elizabeth.privateId, 4, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 3, 20);
				phase.submitBet(george.privateId, "Black", 15);
				phase.submitBet(george.privateId, 6, 15);
				
				phase.resolve();
				
				// Alice wins 1x her bet on Red and loses her bet on
				// AllTooHigh, but gets her reserved chip back.
				expect(alice.chips).to.equal(100 + 1*15 - 10 + 1);
				// Bob wins 4x on his bet on 1 and loses his bet on Black, but
				// gets his reserved chip back and wins the round bonus chips.
				expect(bob.chips).to.equal(100 + 4*10 - 15 + 1 + 3);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
				// Frieren loses both of her bets, but gets her reserved chips
				// back.
				expect(frieren.chips).to.equal(100 - 15 - 20 + 2);
				// George loses both of his bets, but gets his reserved chips
				// back.
				expect(george.chips).to.equal(100 - 15 - 15 + 2);
			});
			
			test("pays out when third guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const george = makePlayer("George");
				const phase = makeBettingPhase({
					answer: 62,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90], [george, 100]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 3, 20);
				phase.submitBet(elizabeth.privateId, 4, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 3, 20);
				phase.submitBet(george.privateId, "Black", 15);
				phase.submitBet(george.privateId, 6, 15);
				
				phase.resolve();
				
				// Alice wins 1x her bet on Red and loses her bet on,
				// AllTooHigh, but gets her reserved chips back.
				expect(alice.chips).to.equal(100 + 1*15 - 10 + 1);
				// Bob loses both of his bets, but gets his reserved chips back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie wins 3x his bet on 2 and loses his bet on 0, but
				// gets his reserved chip back and wins the round bonus chips.
				expect(charlie.chips).to.equal(100 + 3*15 - 10 + 1 + 3);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth wins 3x her bet on 2 and loses her bet on 4, but
				// gets her reserved chip back.
				expect(elizabeth.chips).to.equal(100 + 3*25 - 5 + 1);
				// Frieren loses both of her bets, but gets her reserved chips
				// back.
				expect(frieren.chips).to.equal(100 - 15 - 20 + 2);
				// George loses both of his bets, but gets his reserved chips
				// back.
				expect(george.chips).to.equal(100 - 15 - 15 + 2);
			});
			
			test("pays out when fourth guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const george = makePlayer("George");
				const phase = makeBettingPhase({
					answer: 72,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90], [george, 100]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 3, 20);
				phase.submitBet(elizabeth.privateId, 4, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 3, 20);
				phase.submitBet(george.privateId, "Black", 15);
				phase.submitBet(george.privateId, 6, 15);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob loses both of his bets, but gets his reserved chips back.
				expect(bob.chips).to.equal(100 - 10 - 15 + 2);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek wins 2x his bet on 3, and wins the round bonus chips.
				expect(derek.chips).to.equal(100 + 2*20 + 3);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
				// Frieren wins 2x her bet on 3 and loses her bet on 5, but gets
				// her reserved chips back.
				expect(frieren.chips).to.equal(100 + 2*20 - 15 + 1);
				// George loses both of his bets, but gets his reserved chips
				// back.
				expect(george.chips).to.equal(100 - 15 - 15 + 2);
			});
			
			test("pays out when fifth guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const george = makePlayer("George");
				const phase = makeBettingPhase({
					answer: 82,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90], [george, 100]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 3, 20);
				phase.submitBet(elizabeth.privateId, 4, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 3, 20);
				phase.submitBet(george.privateId, "Black", 15);
				phase.submitBet(george.privateId, 6, 15);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob wins 1x his bet on Black and loses his bet on 1, but gets
				// his reserved chip back.
				expect(bob.chips).to.equal(100 + 1 * 15 - 10 + 1);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth wins 3x her bet on 4 and loses her bet on 2, but
				// gets her reserved chip back and wins the round bonus chips.
				expect(elizabeth.chips).to.equal(100 + 3*5 - 25 + 1 + 3);
				// Frieren loses both of her bets, but gets her reserved chips
				// back.
				expect(frieren.chips).to.equal(100 - 15 - 20 + 2);
				// George wins 1x his bet on Black and loses his bet on 6, but
				// gets his reserved chip back.
				expect(george.chips).to.equal(100 + 1*15 - 15 + 1);
			});
			
			test("pays out when sixth guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const george = makePlayer("George");
				const phase = makeBettingPhase({
					answer: 92,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90], [george, 100]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 3, 20);
				phase.submitBet(elizabeth.privateId, 4, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 3, 20);
				phase.submitBet(george.privateId, "Black", 15);
				phase.submitBet(george.privateId, 6, 15);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob wins 1x his bet on Black and loses his bet on 1, but gets
				// his reserved chip back.
				expect(bob.chips).to.equal(100 + 1 * 15 - 10 + 1);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
				// Frieren loses both of her bets, but gets her reserved chips
				// back and wins the round bonus chips.
				expect(frieren.chips).to.equal(100 - 15 - 20 + 2 + 3);
				// George wins 1x his bet on Black and loses his bet on 6, but
				// gets his reserved chip back.
				expect(george.chips).to.equal(100 + 1*15 - 15 + 1);
			});
			
			test("pays out when seventh guess wins", () => {
				const alice = makePlayer("Alice");
				const bob = makePlayer("Bob");
				const charlie = makePlayer("Charlie");
				const derek = makePlayer("Derek");
				const elizabeth = makePlayer("Elizabeth");
				const frieren = makePlayer("Frieren");
				const george = makePlayer("George");
				const phase = makeBettingPhase({
					answer: 102,
					round: 3,
					guesses: [[alice, 40], [bob, 50], [charlie, 60], [derek, 70], [elizabeth, 80], [frieren, 90], [george, 100]],
				});
				
				phase.submitBet(alice.privateId, "AllTooHigh", 10);
				phase.submitBet(alice.privateId, "Red", 15);
				phase.submitBet(bob.privateId, 1, 10);
				phase.submitBet(bob.privateId, "Black", 15);
				phase.submitBet(charlie.privateId, 0, 10);
				phase.submitBet(charlie.privateId, 2, 15);
				phase.submitBet(derek.privateId, 3, 20);
				phase.submitBet(elizabeth.privateId, 4, 5);
				phase.submitBet(elizabeth.privateId, 2, 25);
				phase.submitBet(frieren.privateId, 6, 15);
				phase.submitBet(frieren.privateId, 3, 20);
				phase.submitBet(george.privateId, "Black", 15);
				phase.submitBet(george.privateId, 6, 15);
				
				phase.resolve();
				
				// Alice loses both of her bets, but gets her reserved chips
				// back.
				expect(alice.chips).to.equal(100 - 10 - 15 + 2);
				// Bob wins 1x his bet on Black and loses his bet on 1, but gets
				// his reserved chip back.
				expect(bob.chips).to.equal(100 + 1*15 - 10 + 1);
				// Charlie loses both of his bets, but gets his reserved chips
				// back.
				expect(charlie.chips).to.equal(100 - 10 - 15 + 2);
				// Derek loses his bet on 3, but gets his reserved chips back.
				expect(derek.chips).to.equal(100 - 20 + 2);
				// Elizabeth loses both of her bets, but gets her reserved chips
				// back.
				expect(elizabeth.chips).to.equal(100 - 5 - 25 + 2);
				// Frieren wins 5x her bet on 6 and loses her bet on 3, but gets
				// her reserved chip back.
				expect(frieren.chips).to.equal(100 + 5*15 - 20 + 1);
				// George wins 1x his bet on Black and 5x his bet on 6, and wins
				// the round bonus chips.
				expect(george.chips).to.equal(100 + 1*15 + 5*15 + 3);
			});
		});
		
		test("pays out spectators", () => {
			const alice = makePlayer("Alice");
			const bob = makeSpectator("Bob");
			const phase = makeBettingPhase({
				answer: 42,
				round: 3,
				guesses: [[alice, 50]],
				spectators: [bob],
			});
			
			phase.submitBet(bob.privateId, "AllTooHigh", 10);
			
			const conclusion = phase.resolve();
			
			expect(conclusion).to.deep.equal({
				type: "conclusion",
				players: {
					winners: [],
					earnings: {
						[alice.publicId]: 0,
					},
				},
				spectators: {
					winners: [],
					earnings: {
						[bob.publicId]: 10 + 6*10,
					},
				},
			});
			
			// Bob wins 6x his bet.
			expect(bob.chips).to.equal(100 + 6 * 10);
		});
		
		test("pays out spectator bonus chips", () => {
			const alice = makePlayer("Alice");
			const bob = makeSpectator("Bob");
			const charlie = makeSpectator("Charlie");
			const derek = makeSpectator("Derek");
			const elizabeth = makeSpectator("Elizabeth");
			const phase = makeBettingPhase({
				answer: 42,
				round: 3,
				guesses: [[alice, 30]],
				spectators: [bob, charlie, derek, elizabeth],
				specGuesses: [[bob, 20], [charlie, 30], [derek, 42], [elizabeth, 50]],
			});
			
			const conclusion = phase.resolve();
			expect(conclusion).to.deep.equal({
				type: "conclusion",
				players: {
					winners: [alice.publicId],
					earnings: {
						[alice.publicId]: 3,
					},
				},
				spectators: {
					winners: [charlie.publicId, derek.publicId],
					earnings: {
						[bob.publicId]: 0,
						[charlie.publicId]: 3,
						[derek.publicId]: 3,
						[elizabeth.publicId]: 0,
					},
				},
			});
			
			expect(bob.chips).to.equal(100);
			expect(charlie.chips).to.equal(100 + 3);
			expect(derek.chips).to.equal(100 + 3);
			expect(elizabeth.chips).to.equal(100);
		});
	});
});
