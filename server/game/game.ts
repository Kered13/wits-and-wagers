import { type GameState } from "../../shared/game/game.interface.js";


export class Game {
	private counter: number = 0;
	
	constructor(private readonly title: string) {}
	
	public addOne(): void {
		this.counter++;
	}
	
	public resetCounter(): void {
		this.counter = 0;
	}
	
	public getJson(): GameState {
		return {
			title: this.title,
			counter: this.counter
		};
	}
}
