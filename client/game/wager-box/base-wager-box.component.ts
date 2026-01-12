import { Directive, HostBinding, HostListener, input, linkedSignal, output, Signal } from "@angular/core";

import { BetData } from "../betting-chip/betting-chip.component.js";
import { OrientationObserver } from "../orientation-observer.js";
import { RandomizedList } from "../../utils/randomized-list.js";


@Directive()
export abstract class BaseWagerBox {
	readonly color = input.required<string>();
	readonly bets = input<BetData[]>([]);
	readonly enabled = input<boolean>(false);
	readonly canDarken = input<boolean>(false);
	
	readonly betsOnBoard: Signal<RandomizedList<BetData>>;
	
	readonly onClick = output<void>();
	
	abstract chipPositions(): string[];
	
	constructor(readonly orientation: OrientationObserver) {
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
		return this.enabled();
	}
	
	@HostBinding("class.darken")
	private get darkenClass() {
		return !this.enabled() && this.canDarken();
	}
	
	@HostListener("click")
	click(): void {
		if (this.enabled()) {
			this.onClick.emit();
		}
	}
};
