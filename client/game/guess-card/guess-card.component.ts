import { ChangeDetectionStrategy, Component, HostBinding, HostListener, input, output } from "@angular/core";
import { MatIcon } from "@angular/material/icon";
import { Ng2FittextModule } from "ng2-fittext";

import { SPECTATOR } from "../../../shared/color";


export type GuessCardData = {
	type: "player" | "spectator";
	// If value is not provided, the card is face-down.
	value: number | boolean;
	color: string;
};


@Component({
	selector: "guess-card",
	imports: [Ng2FittextModule, MatIcon],
	templateUrl: "./guess-card.component.html",
	styleUrl: "./guess-card.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuessCard {
	readonly data = input.required<GuessCardData>();
	readonly enabled = input<boolean>(false);
	
	readonly onClick = output<void>();
	
	readonly numberFormatter = new Intl.NumberFormat();
	
	@HostBinding("style.visibility")
	private get visible(): string {
		return this.data().value === false ? "hidden" : "visible";
	}
	
	@HostBinding("style.--player-color")
	private get color(): string {
		return this.data().color ?? SPECTATOR;
	}
	
	@HostBinding("class.enabled")
	private get enabledClass(): boolean {
		return this.enabled();
	}
	
	isSpectator(): boolean {
		return this.data().type === "spectator";
	}
	
	formattedValue(value: number): string {
		return this.numberFormatter.format(value);
	}
	
	@HostListener("click")
	click(): void {
		if (this.enabled()) {
			this.onClick.emit();
		}
	}
};
