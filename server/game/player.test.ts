import { describe, expect, test } from "vitest";

import { Player, PlayerManager } from "./player";


function makePlayer(name: string): Player {
	return new Player({
		name: name,
		publicId: `public-${name}`,
		privateId: `private-${name}`,
		color: "#FF0000"
	});
};

describe("Player", () => {
	test("toJson", () => {
		const player = makePlayer("Alice");
		player.chips = 13;
		
		expect(player.toJson()).to.deep.equal({
			name: "Alice",
			publicId: "public-Alice",
			color: "#FF0000",
			chips: 13
		});
	});
	
	test("begins with 2 chips", () => {
		const player = makePlayer("Alice");
		
		expect(player.toJson()).to.deep.equal({
			name: "Alice",
			publicId: "public-Alice",
			color: "#FF0000",
			chips: 2
		});
	});
});

describe("PlayerManager", () => {
	test("hasPrivatePlayer finds player", () => {
		const player = makePlayer("Alice");
		const manager = new PlayerManager([player]);
		
		expect(manager.hasPrivatePlayer(player.privateId)).to.be.true;
	});
	
	test("hasPrivatePlayer returns false on missing player", () => {
		const manager = new PlayerManager([]);
		expect(manager.hasPrivatePlayer("nonexistent")).to.be.false;
	});
	
	test("hasPublicPlayer finds player", () => {
		const player = makePlayer("Alice");
		const manager = new PlayerManager([player]);
		
		expect(manager.hasPublicPlayer(player.publicId)).to.be.true;
	});
	
	test("hasPublicPlayer returns false on missing player", () => {
		const manager = new PlayerManager([]);
		expect(manager.hasPublicPlayer("nonexistent")).to.be.false;
	});
	
	test("getPrivatePlayer finds player", () => {
		const player = makePlayer("Alice");
		const manager = new PlayerManager([player]);
		
		expect(manager.getPrivatePlayer(player.privateId)).to.equal(player);
	});
	
	test("getPrivatePlayer throws on missing player", () => {
		const manager = new PlayerManager([]);
		expect(() => manager.getPrivatePlayer("nonexistent")).to.throw();
	});
	
	test("getPublicPlayer finds player", () => {
		const player = makePlayer("Alice");
		const manager = new PlayerManager([player]);
		
		expect(manager.getPublicPlayer(player.publicId)).to.equal(player);
	});
	
	test("getPublicPlayer throws on missing player", () => {
		const manager = new PlayerManager([]);
		expect(() => manager.getPublicPlayer("nonexistent")).to.throw();
	});
	
	test("getAll returns all players", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		const manager = new PlayerManager([alice, bob, charlie]);
		
		expect(manager.getAll()).to.have.members([alice, bob, charlie]);
	});
	
	test("toJson returns all players sorted by chips", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		const manager = new PlayerManager([alice, bob, charlie]);
		
		alice.chips = 10;
		bob.chips = 20;
		charlie.chips = 5;
		
		expect(manager.toJson()).to.have.deep.ordered.members([
			{
				name: "Bob",
				publicId: "public-Bob",
				color: "#FF0000",
				chips: 20
			},
			{
				name: "Alice",
				publicId: "public-Alice",
				color: "#FF0000",
				chips: 10
			},
			{
				name: "Charlie",
				publicId: "public-Charlie",
				color: "#FF0000",
				chips: 5
			},
		]);
	});
});
