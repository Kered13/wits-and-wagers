import { Directive, HostBinding, HostListener, input, linkedSignal, output, Signal } from "@angular/core";

import { RandomizedList } from "../../utils/randomized-list";


export type BetData = {
	name: string;
	value: number;
	// If color is not provided, this is a spectator bet.
	color?: string;
};


@Directive()
export abstract class BaseWagerBox {
	readonly color = input.required<string>();
	readonly bets = input<BetData[]>([]);
	readonly disabled = input<boolean>(false);
	
	readonly betsOnBoard: Signal<RandomizedList<BetData>>;
	
	readonly onClick = output<void>();
	
	abstract chipPositions(): string[];
	
	constructor() {
		this.betsOnBoard = linkedSignal<BetData[], RandomizedList<BetData>>({
			source: this.bets,
			computation: (bets, previous) => {
				const old = previous?.value ?? new RandomizedList<BetData>([], 2, 8);
				return old.update(bets);
			},
		});
	}
	
	@HostBinding("style.--bg-color")
	private get bgColor() {
		return this.color();
	}
	
	@HostBinding("class.enabled")
	private get enabledClass() {
		return !this.disabled();
	}
	
	@HostListener("click")
	private click(): void {
		if (!this.disabled()) {
			this.onClick.emit();
		}
	}
};
