import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { MatIcon } from "@angular/material/icon";
import { Ng2FittextModule } from "ng2-fittext";

import { PublicId } from "../../../shared/player";
import { Color } from "../../../shared/color";


export type PlayerScoreCard = {
	name: string,
	publicId: PublicId,
	chips: number,
	color?: Color,
}


@Component({
	selector: "score-board",
	imports: [MatIcon, Ng2FittextModule],
	templateUrl: "./score-board.component.html",
	styleUrl: "./score-board.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreBoard {
	readonly players = input.required<PlayerScoreCard[]>();
};
