import { type GameJson } from "../../shared/game/game.js";
import type { Serializable } from "../utils/serializable.js";


export class Game implements Serializable<GameJson> {
	private counter: number = 0;
	
	constructor(private readonly title: string) {}
	
	public addOne(): void {
		this.counter++;
	}
	
	public resetCounter(): void {
		this.counter = 0;
	}
	
	public toJson(): GameJson {
		return {
			title: this.title,
			counter: this.counter
		};
	}
}
