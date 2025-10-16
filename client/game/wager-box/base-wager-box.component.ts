import { Directive, input } from "@angular/core";


type Guess = {
	value: number;
	color: string;
};


type Bet = {
	value: number;
	color: string;
};


@Directive()
export abstract class BaseWagerBox {
	color = input.required<string>();
	guess = input<Guess | undefined>();
	bets = input<Bet[]>([]);
	payoff = input.required<string>();
	
	abstract chipPositions(): string[];
};
