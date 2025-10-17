import { Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BaseWagerBox } from "./base-wager-box.component.js";
import { BettingChip } from "../betting-chip/betting-chip.component.js";


@Component({
	selector: "color-wager-box",
	imports: [Ng2FittextModule, BettingChip],
	templateUrl: "./base-wager-box.component.html",
	styleUrl: "./base-wager-box.component.css"
})
export class ColorWagerBox extends BaseWagerBox {
	override chipPositions() {
		return [
			"2% 29%",
			"5% 71%",
			"19% 57%",
			"20% 15%",
			"8% 1%",
			"4% 43%",
			"17% 85%",
		];
	}
};
