import { ChangeDetectionStrategy, Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BettingChip } from "../../common/betting-chip/betting-chip.component.js";
import { SpectatorChip } from "../../common/spectator-chip/spectator-chip.component.js";
import { BaseWagerBox } from "../../common/wager-box/base-wager-box.component.js";


@Component({
	selector: "desktop-all-too-high-box",
	imports: [Ng2FittextModule, BettingChip, SpectatorChip],
	templateUrl: "../../common/wager-box/base-wager-box.component.html",
	styleUrl: "../../common/wager-box/base-wager-box.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllTooHighBox extends BaseWagerBox {
	override chipPositions() {
		return [
			"43% 16%",
			"71% 18%",
			"13% 30%",
			"57% 10%",
			"28% 7%",
			"85% 6%",
			"-1% 5%",
			"18% -40%",
		];
	}
};
