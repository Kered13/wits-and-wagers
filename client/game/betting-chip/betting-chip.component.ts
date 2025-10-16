import { Component, input } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";


@Component({
	selector: "betting-chip",
	imports: [Ng2FittextModule],
	templateUrl: "./betting-chip.component.html",
	styleUrls: ["./betting-chip.component.css"],
})
export class BettingChip {
	value = input.required<number>();
	color = input.required<string>();
}
