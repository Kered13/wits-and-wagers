import { type GameState } from "../../shared/game/game.interface.js";


export class Game {
	private counter: number = 0;
	
	constructor(private readonly title: string) {}
	
	addOne(): void {
		this.counter++;
	}
	
	resetCounter(): void {
		this.counter = 0;
	}
	
	getJson(): GameState {
		return {
			title: this.title,
			counter: this.counter
		};
	}
}
