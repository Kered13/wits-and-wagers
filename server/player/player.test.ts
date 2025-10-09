import { describe, expect, test } from "vitest";

import { Player, Spectator } from "./player.js";


function makeSpectator(name: string): Spectator {
	return new Spectator({
		name: name,
		publicId: `public-${name}`,
		privateId: `private-${name}`
	});
};

function makePlayer(name: string): Player {
	return new Player({
		name: name,
		publicId: `public-${name}`,
		privateId: `private-${name}`,
		color: "#FF0000"
	});
};


describe("Spectator", () => {
	test("toLobbyJson", () => {
		const player = makeSpectator("Alice");
		player.chips = 13;
		
		expect(player.toLobbyJson()).to.deep.equal({
			name: "Alice",
			publicId: "public-Alice",
		});
	});
	
	test("toGameJson", () => {
		const player = makeSpectator("Alice");
		player.chips = 13;
		
		expect(player.toGameJson()).to.deep.equal({
			name: "Alice",
			publicId: "public-Alice",
			chips: 13,
		});
	});
	
	test("begins with 2 chips", () => {
		const player = makeSpectator("Alice");
		
		expect(player.toGameJson()).to.deep.equal({
			name: "Alice",
			publicId: "public-Alice",
			chips: 2,
		});
	});
});


describe("Player", () => {
	test("toLobbyJson", () => {
		const player = makePlayer("Alice");
		player.chips = 13;
		
		expect(player.toLobbyJson()).to.deep.equal({
			name: "Alice",
			publicId: "public-Alice",
			color: "#FF0000",
		});
	});
	
	test("toGameJson", () => {
		const player = makePlayer("Alice");
		player.chips = 13;
		
		expect(player.toGameJson()).to.deep.equal({
			name: "Alice",
			publicId: "public-Alice",
			color: "#FF0000",
			chips: 13,
		});
	});
	
	test("begins with 2 chips", () => {
		const player = makePlayer("Alice");
		
		expect(player.toGameJson()).to.deep.equal({
			name: "Alice",
			publicId: "public-Alice",
			color: "#FF0000",
			chips: 2,
		});
	});
});
