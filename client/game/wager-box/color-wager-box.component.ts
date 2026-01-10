import { ChangeDetectionStrategy, Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BaseWagerBox } from "./base-wager-box.component.js";
import { BettingChip } from "../betting-chip/betting-chip.component.js";


@Component({
	selector: "color-wager-box",
	imports: [Ng2FittextModule, BettingChip],
	templateUrl: "./base-wager-box.component.html",
	styleUrl: "./base-wager-box.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorWagerBox extends BaseWagerBox {
	override chipPositions() {
		if (this.orientation.isLandscape()) {
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
		} else {
			return [
				"100px 30px",
				"50px 5px",
				"230px 15px",
				"185px 42px",
				"275px 0px",
				"145px 0px",
				"5px 30px",
				"305px 40px",
			];
		}
	}
};
