import { Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BaseWagerBox } from "./base-wager-box.component.js";
import { BettingChip } from "../betting-chip/betting-chip.component.js";


@Component({
	selector: 'betting-box',
	imports: [Ng2FittextModule, BettingChip],
	templateUrl: './base-wager-box.component.html',
	styleUrl: './base-wager-box.component.css'
})
export class BettingBox extends BaseWagerBox {
	override chipPositions() {
		return [
			"58% 45%",
			"67% 4%",
			"76% 47%",
			"24% 13%",
			"13% 45%",
			"2% 6%",
			"85% 6%",
		];
	}
};
