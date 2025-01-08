import type { GameJson } from "../../shared/game/game.interface.js";


export class Game {
	private counter: number = 0;
	
	addOne(): void {
		this.counter++;
	}
	
	resetCounter(): void {
		this.counter = 0;
	}
	
	getJson(): GameJson {
		return {counter: this.counter};
	}
}
