import { Directive, HostBinding, HostListener, input, output } from "@angular/core";


export type BetData = {
	value: number;
	color: string;
};

export type SpectatorBetData = {
	value: number;
	name: string;
}


@Directive()
export abstract class BaseWagerBox {
	readonly color = input.required<string>();
	readonly bets = input<BetData[]>([]);
	readonly spectatorBet = input<SpectatorBetData>();
	readonly disabled = input<boolean>(false);
	
	readonly onClick = output<void>();
	
	abstract chipPositions(): string[];
	abstract spectatorChipPosition(): string;
	
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
