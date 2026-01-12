import { ChangeDetectionStrategy, Component, HostBinding, input } from "@angular/core";
import { MatIcon } from "@angular/material/icon";
import { Ng2FittextModule } from "ng2-fittext";

import { SPECTATOR } from "../../../shared/color";


export type BetData = {
	type: "player" | "spectator";
	value: number;
	color: string;
};


@Component({
	selector: "betting-chip",
	imports: [Ng2FittextModule, MatIcon],
	templateUrl: "./betting-chip.component.html",
	styleUrls: ["./betting-chip.component.css"],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BettingChip {
	readonly data = input.required<BetData>();
	
	@HostBinding("style.--player-color")
	private get color(): string {
		return this.data().color ?? SPECTATOR;
	}
	
	isSpectator(): boolean {
		return this.data().type === "spectator";
	}
}
