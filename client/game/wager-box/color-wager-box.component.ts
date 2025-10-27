import { Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BaseWagerBox } from "./base-wager-box.component.js";
import { BettingChip } from "../betting-chip/betting-chip.component.js";
import { SpectatorChip } from "../spectator-chip/spectator-chip.component.js";


@Component({
	selector: "color-wager-box",
	imports: [Ng2FittextModule, BettingChip, SpectatorChip],
	templateUrl: "./base-wager-box.component.html",
	styleUrl: "./base-wager-box.component.css"
})
export class ColorWagerBox extends BaseWagerBox {
	override chipPositions() {
		return [
			"25% 20%",
			"5% 74%",
			"26% 60%",
			"2% 33%",
			"0% 7%",
			"-4% 47%",
			"17% 88%",
			"40% -4%",
		];
	}
};
