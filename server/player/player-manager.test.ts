import { describe, expect, test } from "vitest";

import { Player, Spectator } from "./player";
import { privateId, publicId } from "./player-id";
import { PlayerManager } from "./player-manager";


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


describe("PlayerManager", () => {
	describe("getPrivatePlayer", () => {
		test("finds player", () => {
			const alice = makePlayer("Alice");
			const manager = new PlayerManager([alice], []);
			expect(manager.getPrivatePlayer(alice.privateId)).to.equal(alice);
		});
		
		test("throws on missing player", () => {
			const manager = new PlayerManager([], []);
			expect(() => manager.getPrivatePlayer(privateId("nonexistent"))).to.throw();
		});
		
		test("does not return spectator", () => {
			const alice = makeSpectator("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(() => manager.getPrivatePlayer(alice.privateId)).to.throw();
		});
		
		test("does not return on public ID", () => {
			const alice = makePlayer("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(() => manager.getPrivatePlayer(privateId(alice.publicId))).to.throw();
		});
	});
	
	describe("getPrivateSpectator", () => {
		test("finds spectator", () => {
			const alice = makeSpectator("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(manager.getPrivateSpectator(alice.privateId)).to.equal(alice);
		});
		
		test("throws on missing spectator", () => {
			const manager = new PlayerManager([], []);
			expect(() => manager.getPrivateSpectator(privateId("nonexistent"))).to.throw();
		});
		
		test("does not return player", () => {
			const alice = makePlayer("Alice");
			const manager = new PlayerManager([alice], []);
			expect(() => manager.getPrivateSpectator(alice.privateId)).to.throw();
		});
		
		test("does not return on public ID", () => {
			const alice = makeSpectator("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(() => manager.getPrivateSpectator(privateId(alice.publicId))).to.throw();
		});
	});
	
	describe("getPublicPlayer", () => {
		test("finds player", () => {
			const alice = makePlayer("Alice");
			const manager = new PlayerManager([alice], []);
			expect(manager.getPublicPlayer(alice.publicId)).to.equal(alice);
		});
		
		test("throws on missing player", () => {
			const manager = new PlayerManager([], []);
			expect(() => manager.getPublicPlayer(publicId("nonexistent"))).to.throw();
		});
		
		test("does not return spectator", () => {
			const alice = makeSpectator("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(() => manager.getPublicPlayer(alice.publicId)).to.throw();
		});
		
		test("does not return on private ID", () => {
			const alice = makePlayer("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(() => manager.getPublicPlayer(publicId(alice.privateId))).to.throw();
		});
	});
	
	describe("getPublicSpectator", () => {
		test("finds spectator", () => {
			const alice = makeSpectator("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(manager.getPublicSpectator(alice.publicId)).to.equal(alice);
		});
		
		test("throws on missing spectator", () => {
			const manager = new PlayerManager([], []);
			expect(() => manager.getPublicSpectator(publicId("nonexistent"))).to.throw();
		});
		
		test("does not return player", () => {
			const alice = makePlayer("Alice");
			const manager = new PlayerManager([alice], []);
			expect(() => manager.getPublicSpectator(alice.publicId)).to.throw();
		});
		
		test("does not return on private ID", () => {
			const alice = makeSpectator("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(() => manager.getPublicSpectator(publicId(alice.privateId))).to.throw();
		});
	});
	
	describe("tryGetPrivatePlayer", () => {
		test("finds player", () => {
			const alice = makePlayer("Alice");
			const manager = new PlayerManager([alice], []);
			expect(manager.tryGetPrivatePlayer(alice.privateId)).to.equal(alice);
		});
		
		test("returned undefined on missing player", () => {
			const manager = new PlayerManager([], []);
			expect(manager.tryGetPrivatePlayer(privateId("nonexistent"))).to.be.undefined;
		});
		
		test("does not return spectator", () => {
			const alice = makeSpectator("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(manager.tryGetPrivatePlayer(alice.privateId)).to.be.undefined;
		});
		
		test("does not return on publicId", () => {
			const alice = makePlayer("Alice");
			const manager = new PlayerManager([alice], []);
			expect(manager.tryGetPrivatePlayer(privateId(alice.publicId))).to.be.undefined;
		});
	});
	
	describe("tryGetPrivateSpectator", () => {
		test("finds spectator", () => {
			const alice = makeSpectator("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(manager.tryGetPrivateSpectator(alice.privateId)).to.equal(alice);
		});
		
		test("returned undefined on missing spectator", () => {
			const manager = new PlayerManager([], []);
			expect(manager.tryGetPrivateSpectator(privateId("nonexistent"))).to.be.undefined;
		});
		
		test("does not return player", () => {
			const alice = makePlayer("Alice");
			const manager = new PlayerManager([alice], []);
			expect(manager.tryGetPrivateSpectator(alice.privateId)).to.be.undefined;
		});
		
		test("does not return on publicId", () => {
			const alice = makeSpectator("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(manager.tryGetPrivateSpectator(privateId(alice.publicId))).to.be.undefined;
		});
	});
	
	describe("tryGetPublicPlayer", () => {
		test("finds player", () => {
			const alice = makePlayer("Alice");
			const manager = new PlayerManager([alice], []);
			expect(manager.tryGetPublicPlayer(alice.publicId)).to.equal(alice);
		});
		
		test("returned undefined on missing player", () => {
			const manager = new PlayerManager([], []);
			expect(manager.tryGetPublicPlayer(publicId("nonexistent"))).to.be.undefined;
		});
		
		test("does not return spectator", () => {
			const alice = makeSpectator("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(manager.tryGetPublicPlayer(alice.publicId)).to.be.undefined;
		});
		
		test("does not return on privateId", () => {
			const alice = makePlayer("Alice");
			const manager = new PlayerManager([alice], []);
			expect(manager.tryGetPublicPlayer(publicId(alice.privateId))).to.be.undefined;
		});
	});
	
	describe("tryGetPublicSpectator", () => {
		test("finds spectator", () => {
			const alice = makeSpectator("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(manager.tryGetPublicSpectator(alice.publicId)).to.equal(alice);
		});
		
		test("returned undefined on missing spectator", () => {
			const manager = new PlayerManager([], []);
			expect(manager.tryGetPublicSpectator(publicId("nonexistent"))).to.be.undefined;
		});
		
		test("does not return player", () => {
			const alice = makePlayer("Alice");
			const manager = new PlayerManager([alice], []);
			expect(manager.tryGetPublicSpectator(alice.publicId)).to.be.undefined;
		});
		
		test("does not return on privateId", () => {
			const alice = makeSpectator("Alice");
			const manager = new PlayerManager([], [alice]);
			expect(manager.tryGetPublicSpectator(publicId(alice.privateId))).to.be.undefined;
		});
	});
	
	test("getAllPlayers returns all players", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makePlayer("Charlie");
		const derek = makeSpectator("Derek");
		const manager = new PlayerManager([alice, bob, charlie], [derek]);
		
		expect(manager.getAllPlayers()).to.have.members([alice, bob, charlie]);
	});
	
	test("getAllSpectators returns all spectators", () => {
		const alice = makePlayer("Alice");
		const bob = makeSpectator("Bob");
		const charlie = makeSpectator("Charlie");
		const derek = makeSpectator("Derek");
		const manager = new PlayerManager([alice], [bob, charlie, derek]);
		
		expect(manager.getAllSpectators()).to.have.members([bob, charlie, derek]);
	});
	
	test("getAllParticipants returns all players and spectators", () => {
		const alice = makePlayer("Alice");
		const bob = makePlayer("Bob");
		const charlie = makeSpectator("Charlie");
		const derek = makeSpectator("Derek");
		const manager = new PlayerManager([alice, bob], [charlie, derek]);
		
		expect(manager.getAllParticipants()).to.have.members([alice, bob, charlie, derek]);
	});
});
