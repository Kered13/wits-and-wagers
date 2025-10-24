import { Component, HostBinding, input } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";


export type GuessCardData = {
	// If value is not provided, the card is face-down.
	value: number | boolean;
	color: string;
};


@Component({
	selector: "guess-card",
	imports: [Ng2FittextModule],
	templateUrl: "./guess-card.component.html",
	styleUrl: "./guess-card.component.css",
})
export class GuessCard {
	readonly data = input.required<GuessCardData>();
	
	@HostBinding("style.visibility") get visible() {
		return this.data().value === false ? "hidden" : "visible";
	}
	
	@HostBinding("style.--card-color") get color() {
		return this.data().color;
	}
};
