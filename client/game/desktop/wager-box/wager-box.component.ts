import { ChangeDetectionStrategy, Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BettingChip } from "../../common/betting-chip/betting-chip.component.js";
import { SpectatorChip } from "../../common/spectator-chip/spectator-chip.component.js";
import { BaseWagerBox } from "../../common/wager-box/base-wager-box.component.js";


@Component({
	selector: "desktop-betting-box",
	imports: [Ng2FittextModule, BettingChip, SpectatorChip],
	templateUrl: "../../common/wager-box/base-wager-box.component.html",
	styleUrl: "./base-wager-box.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
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
			"-1% 10%",
		];
	}
};
