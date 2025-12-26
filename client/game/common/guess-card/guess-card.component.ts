import { ChangeDetectionStrategy, Component, HostBinding, HostListener, input, output } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";


export type GuessCardData = {
	name: string;
	// If value is not provided, the card is face-down.
	value: number | boolean;
	// If color is not provided, this is a spectator guess.
	color?: string;
};


@Component({
	selector: "guess-card",
	imports: [Ng2FittextModule],
	templateUrl: "./guess-card.component.html",
	styleUrl: "./guess-card.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuessCard {
	readonly data = input.required<GuessCardData>();
	readonly disabled = input<boolean>(false);
	
	readonly onClick = output<void>();
	
	@HostBinding("style.visibility")
	private get visible(): string {
		return this.data().value === false ? "hidden" : "visible";
	}
	
	@HostBinding("style.--card-color")
	private get color(): string {
		return this.data().color ?? "lightgrey";
	}
	
	@HostBinding("class.enabled")
	private get enabledClass(): boolean {
		return !this.disabled();
	}
	
	@HostListener("click")
	private click(): void {
		if (!this.disabled()) {
			this.onClick.emit();
		}
	}
};
