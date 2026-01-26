import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { MatIcon } from "@angular/material/icon";
import { Ng2FittextModule } from "ng2-fittext";

import { Color } from "../../../shared/color";
import { PublicId } from "../../../shared/player";


export type PlayerResult = {
	id: PublicId,
	name: string,
	color: Color,
	earnings: number,
	chips: number,
};


@Component({
	selector: "results-table",
	imports: [Ng2FittextModule, MatIcon],
	templateUrl: "./results-table.component.html",
	styleUrl: "./results-table.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsTable {
	readonly players = input.required<PlayerResult[]>();
	readonly type = input.required<"players" | "spectators">();
	
	getHeader(): string {
		return this.type() == "players" ? "Players" : "Spectators";
	}
	
	getIcon(): string {
		return this.type() == "players" ? "account_circle" : "visibility";
	}
}
