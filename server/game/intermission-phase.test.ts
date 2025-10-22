import { describe, expect, test, vi } from "vitest";

import { IntermissionPhase, intermissionPhaseDefaultOptions, IntermissionPhaseOptions } from "./intermission-phase.js";
import { BettingConclusion, SkippedBettingPhase } from "../../shared/game/intermission-phase.js";


function makeIntermissionPhase(outcome: SkippedBettingPhase | BettingConclusion, options?: Partial<IntermissionPhaseOptions>): IntermissionPhase {
	return new IntermissionPhase(
		{ question: "What is the answer?", answer: 42 },
		outcome,
		Object.assign({}, intermissionPhaseDefaultOptions, options));
}


describe("IntermissionPhase", () => {
	test("skippedBettingPhase toJson", () => {
		const phase = makeIntermissionPhase({ type: "skipped" });
		
		expect(phase.toJson("")).to.deep.equal({
			phase: "intermission",
			questionInfo: {
				question: "What is the answer?",
				answer: 42,
			},
			outcome: {
				type: "skipped"
			}
		});
	});
	
	test("bettingConclusion toJson", () => {
		const phase = makeIntermissionPhase({
			type: "conclusion",
			winners: ["public-Alice"],
			earnings: {
				"public-Alice": 100,
				"public-Bob": 200
			},
			spectatorEarnings: {},
		});

		expect(phase.toJson("")).to.deep.equal({
			phase: "intermission",
			questionInfo: {
				question: "What is the answer?",
				answer: 42,
			},
			outcome: {
				type: "conclusion",
				winners: ["public-Alice"],
				earnings: {
					"public-Alice": 100,
					"public-Bob": 200
				},
				spectatorEarnings: {},
			}
		});
	});
	
	test("endPhase called after timeout", () => {
		vi.useFakeTimers();
		
		const phase = makeIntermissionPhase({ type: "skipped" }, { intermissionPhaseDuration: 60_000 });
		
		const callback = vi.fn();
		phase.onEndPhase().subscribe(callback);
		
		vi.advanceTimersByTime(60_000);
		expect(callback).toHaveBeenCalled();
	});
});
