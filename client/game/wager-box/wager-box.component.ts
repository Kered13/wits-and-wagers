import { Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BaseWagerBox } from "./base-wager-box.component.js";
import { BettingChip } from "../betting-chip/betting-chip.component.js";
import { SpectatorChip } from "../spectator-chip/spectator-chip.component.js";


@Component({
	selector: "betting-box",
	imports: [Ng2FittextModule, BettingChip, SpectatorChip],
	templateUrl: "./base-wager-box.component.html",
	styleUrl: "./base-wager-box.component.css",
})
export class BettingBox extends BaseWagerBox {
	override chipPositions() {
		return [
			"60% 52%",
			"65% 5%",
			"26% 50%",
			"76% 50%",
			"17% 10%",
			"7% 55%",
			"81% 3%",
		];
	}
	
	override spectatorChipPosition(): string {
		return "-1% 10%";
	}
};
