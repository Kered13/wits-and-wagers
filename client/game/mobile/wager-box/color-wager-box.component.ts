import { ChangeDetectionStrategy, Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BettingChip } from "../../common/betting-chip/betting-chip.component.js";
import { SpectatorChip } from "../../common/spectator-chip/spectator-chip.component.js";
import { BaseWagerBox } from "../../common/wager-box/base-wager-box.component.js";


@Component({
	selector: "mobile-color-wager-box",
	imports: [Ng2FittextModule, BettingChip, SpectatorChip],
	templateUrl: "../../common/wager-box/base-wager-box.component.html",
	styleUrl: "./base-wager-box.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorWagerBox extends BaseWagerBox {
	override chipPositions() {
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
};
