import { Directive, HostListener, input, output } from "@angular/core";


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
	readonly color = input.required<string>();
	readonly guess = input<Guess | undefined>();
	readonly bets = input<Bet[]>([]);
	readonly payoff = input.required<string>();
	readonly disabled = input<boolean>(false);
	
	readonly onClick = output<void>();
	
	abstract chipPositions(): string[];
	isDisabled(): boolean {
		return this.disabled();
	}
	
	click(): void {
		if (!this.isDisabled()) {
			this.onClick.emit();
		}
	}
};
