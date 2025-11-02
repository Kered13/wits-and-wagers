import { describe, expect, test, vi } from "vitest";

import { IntermissionPhase, DEFAULT_INTERMISSION_PHASE_OPTIONS, IntermissionPhaseOptions } from "./intermission-phase.js";
import { privateId, publicId } from "../player/player-id.js";
import { BettingConclusion, SkippedBettingPhase } from "../../shared/game/intermission-phase.js";


function makeIntermissionPhase(outcome: SkippedBettingPhase | BettingConclusion, options?: Partial<IntermissionPhaseOptions>): IntermissionPhase {
	return new IntermissionPhase(
		{ question: "What is the answer?", answer: 42 },
		outcome,
		Object.assign({}, DEFAULT_INTERMISSION_PHASE_OPTIONS, options));
}


describe("IntermissionPhase", () => {
	test("skippedBettingPhase toJson", () => {
		const phase = makeIntermissionPhase({ type: "skipped" });
		
		expect(phase.toJson(privateId("any"))).to.deep.equal({
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
			players: {
				winners: [publicId("public-Alice")],
				earnings: {
					[publicId("public-Alice")]: 100,
					[publicId("public-Bob")]: 200,
				},
			},
			spectators: {
				winners: [],
				earnings: {},
			},
		});
		
		expect(phase.toJson(privateId("any"))).to.deep.equal({
			phase: "intermission",
			questionInfo: {
				question: "What is the answer?",
				answer: 42,
			},
			outcome: {
				type: "conclusion",
				players: {
					winners: ["public-Alice"],
					earnings: {
						"public-Alice": 100,
						"public-Bob": 200
					},
				},
				spectators: {
					winners: [],
					earnings: {},
				},
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
