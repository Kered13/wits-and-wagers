import { Component, input } from "@angular/core";


type Guess = {
	value: number;
	color: string;
}


type Bet = {
	value: number;
	color: string;
}


@Component({
	selector: 'betting-box',
	imports: [],
	templateUrl: './betting-box.component.html',
	styleUrl: './betting-box.component.css'
})
export class BettingBox {
	color = input.required<string>();
	guess = input<Guess | undefined>();
	bets = input<Bet[]>([]);
	
	chipPositions() {
		return [
			"58% 45%",
			"67% 4%",
			"76% 47%",
			"24% 13%",
			"13% 45%",
			"2% 6%",
			"85% 6%",
		];
	}
};
