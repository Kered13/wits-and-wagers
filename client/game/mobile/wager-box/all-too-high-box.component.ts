import { ChangeDetectionStrategy, Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BettingChip } from "../../common/betting-chip/betting-chip.component.js";
import { SpectatorChip } from "../../common/spectator-chip/spectator-chip.component.js";
import { BaseWagerBox } from "../../common/wager-box/base-wager-box.component.js";


@Component({
	selector: "mobile-all-too-high-box",
	imports: [Ng2FittextModule, BettingChip, SpectatorChip],
	templateUrl: "../../common/wager-box/base-wager-box.component.html",
	styleUrl: "./base-wager-box.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllTooHighBox extends BaseWagerBox {
	override chipPositions() {
		return [
			"20px 145px",
			"8px 195px",
			"30px 95px",
			"5px 50px",
			"30px 240px",
			"0px 280px",
			"30px 5px",
			"40px 305px",
		];
	}
};
