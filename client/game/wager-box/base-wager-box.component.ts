import { Directive, HostBinding, HostListener, input, linkedSignal, output, Signal } from "@angular/core";

import { BetData } from "../bet-data";
import { OrientationObserver } from "../orientation-observer";
import { RandomizedList } from "../../utils/randomized-list";


@Directive()
export abstract class BaseWagerBox {
	readonly color = input.required<string>();
	readonly bets = input<BetData[]>([]);
	readonly enabled = input<boolean>(false);
	
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
	
	@HostListener("click")
	click(): void {
		if (this.enabled()) {
			this.onClick.emit();
		}
	}
};
