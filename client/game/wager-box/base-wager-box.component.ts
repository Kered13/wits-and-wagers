import { Component, Directive, HostListener, input, output } from "@angular/core";


type Bet = {
	value: number;
	color: string;
};


@Directive()
export abstract class BaseWagerBox {
	readonly color = input.required<string>();
	readonly bets = input<Bet[]>([]);
	readonly disabled = input<boolean>(false);
	
	readonly onClick = output<void>();
	
	abstract chipPositions(): string[];
	
	click(): void {
		if (!this.disabled()) {
			this.onClick.emit();
		}
	}
};
