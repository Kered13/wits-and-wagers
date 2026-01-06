import { ChangeDetectionStrategy, Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BettingChip } from "../../common/betting-chip/betting-chip.component.js";
import { SpectatorChip } from "../../common/spectator-chip/spectator-chip.component.js";
import { BaseWagerBox } from "../../common/wager-box/base-wager-box.component.js";


@Component({
	selector: "mobile-betting-box",
	imports: [Ng2FittextModule, BettingChip, SpectatorChip],
	templateUrl: "../../common/wager-box/base-wager-box.component.html",
	styleUrl: "./base-wager-box.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BettingBox extends BaseWagerBox {
	override chipPositions() {
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
};
