import { describe, expect, test } from "vitest";

import { Player } from "./player";
import { PlayerManager } from "./player-manager";


function makePlayer(name: string): Player {
	return new Player({
		name: name,
		publicId: `public-${name}`,
		privateId: `private-${name}`,
		color: "#FF0000"
	});
};


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
	
	test("tryGetPrivatePlayer finds player", () => {
		const player = makePlayer("Alice");
		const manager = new PlayerManager([player]);
		
		expect(manager.tryGetPrivatePlayer(player.privateId)).to.equal(player);
	});
	
	test("tryGetPrivatePlayer returned undefined on missing player", () => {
		const player = makePlayer("Alice");
		const manager = new PlayerManager([player]);
		
		expect(manager.tryGetPrivatePlayer("nonexistent")).to.be.undefined;
	});
	
	test("tryGetPrivatePlayer finds player", () => {
		const player = makePlayer("Alice");
		const manager = new PlayerManager([player]);
		
		expect(manager.tryGetPublicPlayer(player.publicId)).to.equal(player);
	});
	
	test("tryGetPrivatePlayer returned undefined on missing player", () => {
		const player = makePlayer("Alice");
		const manager = new PlayerManager([player]);
		
		expect(manager.tryGetPublicPlayer("nonexistent")).to.be.undefined;
	});
	
	test("getAll returns all players", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		const manager = new PlayerManager([alice, bob, charlie]);
		
		expect(manager.getAll()).to.have.members([alice, bob, charlie]);
	});
});
