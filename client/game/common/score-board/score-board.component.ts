import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { MatIcon } from "@angular/material/icon";
import { Ng2FittextModule } from "ng2-fittext";

import { PlayerScoreData } from "../player-score-data.js";


function isDefined(value: string | undefined): boolean {
	return value !== undefined;
}


@Component({
	selector: "score-board",
	imports: [MatIcon, Ng2FittextModule],
	templateUrl: "./score-board.component.html",
	styleUrl: "./score-board.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreBoard {
	readonly players = input.required<PlayerScoreData[]>();
	
	maxFontSize(element: HTMLElement): number {
		const strVal = element.computedStyleMap().get("--max-font-size")!.toString();
		return parseInt(strVal);
	}
};
