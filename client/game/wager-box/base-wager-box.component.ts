import { Directive, HostBinding, HostListener, input, output } from "@angular/core";


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
