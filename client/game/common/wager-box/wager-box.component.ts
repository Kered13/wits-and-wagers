import { ChangeDetectionStrategy, Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BettingChip } from "../../common/betting-chip/betting-chip.component.js";
import { SpectatorChip } from "../../common/spectator-chip/spectator-chip.component.js";
import { BaseWagerBox } from "../../common/wager-box/base-wager-box.component.js";


@Component({
	selector: "wager-box",
	imports: [Ng2FittextModule, BettingChip, SpectatorChip],
	templateUrl: "../../common/wager-box/base-wager-box.component.html",
	styleUrl: "../../common/wager-box/base-wager-box.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WagerBox extends BaseWagerBox {
	override chipPositions() {
		if (this.orientation.isLandscape()) {
			return [
				"60% 52%",
				"65% 5%",
				"26% 50%",
				"76% 50%",
				"17% 10%",
				"7% 55%",
				"81% 3%",
				"-1% 10%",
			];
		} else {
			return [
				"52px 55px",
				"25px 240px",
				"5px 40px",
				"45px 5px",
				"0px 290px",
				"55px 280px",
				"60px 200px",
				"0px 90px",
			];
		}
	}
};
