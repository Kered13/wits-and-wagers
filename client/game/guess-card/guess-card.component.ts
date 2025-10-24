import { Component, HostBinding, HostListener, input, output } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";


export type GuessCardData = {
	// If value is not provided, the card is face-down.
	value: number | boolean;
	color: string;
};


@Component({
	selector: "guess-card",
	imports: [Ng2FittextModule],
	templateUrl: "./guess-card.component.html",
	styleUrl: "./guess-card.component.css",
})
export class GuessCard {
	readonly data = input.required<GuessCardData>();
	readonly disabled = input<boolean>(false);
	
	readonly onClick = output<void>();
	
	@HostBinding("style.visibility")
	private get visible() {
		return this.data().value === false ? "hidden" : "visible";
	}
	
	@HostBinding("style.--card-color")
	private get color() {
		return this.data().color;
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
