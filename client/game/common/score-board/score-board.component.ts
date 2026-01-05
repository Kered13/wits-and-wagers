import { ChangeDetectionStrategy, Component, HostBinding, input } from "@angular/core";
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
	readonly desktop = input(false, { transform: isDefined });
	readonly mobile = input(false, { transform: isDefined });
	readonly players = input.required<PlayerScoreData[]>();
	
	@HostBinding("class.desktop")
	private get desktopClass(): boolean {
		return this.desktop();
	}
	
	@HostBinding("class.mobile")
	private get mobileClass(): boolean {
		return this.mobile();
	}
	
	maxFontSize(element: HTMLElement): number {
		const strVal = element.computedStyleMap().get("--max-font-size")!.toString();
		return parseInt(strVal);
	}
};
