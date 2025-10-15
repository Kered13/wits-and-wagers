import { Component } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";

import { BaseWagerBox } from "./base-wager-box.component.js";


@Component({
	selector: 'all-too-high-box',
	imports: [Ng2FittextModule],
	templateUrl: './base-wager-box.component.html',
	styleUrl: './base-wager-box.component.css'
})
export class AllTooHighBox extends BaseWagerBox {
	override chipPositions() {
		return [
			"43% 16%",
			"71% 18%",
			"15% 20%",
			"57% 10%",
			"29% 7%",
			"85% 6%",
			"1% 5%",
		];
	}
};
