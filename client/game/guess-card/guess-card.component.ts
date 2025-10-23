import { Component, input } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";


type Guess = {
	// If value is not provided, the guess is face-down.
	value?: number;
	color: string;
};


@Component({
	selector: "guess-card",
	imports: [Ng2FittextModule],
	templateUrl: "./guess-card.component.html",
	styleUrl: "./guess-card.component.css",
})
export class GuessCard {
	readonly guess = input.required<Guess>();
};
