import { Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BaseWagerBox } from "./base-wager-box.component.js";
import { BettingChip } from "../betting-chip/betting-chip.component.js";


@Component({
	selector: "betting-box",
	imports: [Ng2FittextModule, BettingChip],
	templateUrl: "./base-wager-box.component.html",
	styleUrl: "./base-wager-box.component.css",
})
export class BettingBox extends BaseWagerBox {
	override chipPositions() {
		return [
			"60% 45%",
			"70% 7%",
			"26% 50%",
			"80% 50%",
			"7% 55%",
			"1% 3%",
			"17% 10%",
		];
	}
};
