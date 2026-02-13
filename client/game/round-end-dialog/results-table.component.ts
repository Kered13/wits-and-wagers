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


const MAX_PLAYERS_TO_SHOW = 7;


@Component({
	selector: "results-table",
	imports: [Ng2FittextModule, MatIcon],
	templateUrl: "./results-table.component.html",
	styleUrl: "./results-table.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsTable {
	readonly players = input.required<PlayerResult[]>();
	readonly thisParticipant = input.required<PublicId>();
	readonly type = input.required<"players" | "spectators">();
	
	getHeader(): string {
		return this.type() == "players" ? "Players" : "Spectators";
	}
	
	getIcon(): string {
		return this.type() == "players" ? "account_circle" : "visibility";
	}
	
	getAbridgedPlayers(): ([number, PlayerResult] | undefined)[] {
		if (this.players().length <= MAX_PLAYERS_TO_SHOW) {
			// Case 1: There are <= N spectators.
			return this.players().map((player, index) => [index + 1, player]);
		}
		
		const thisPlayerIndex = this.players().findIndex(player => player.id === this.thisParticipant());
		
		let abridged: ([number, PlayerResult] | undefined)[];
		if (thisPlayerIndex < MAX_PLAYERS_TO_SHOW) {
			// Case 2: This player is not among players (-1), or is in the top N.
			abridged = this.topNPlayers(MAX_PLAYERS_TO_SHOW - 1);
			abridged.push(undefined);
		} else if (thisPlayerIndex < this.players().length - 2) {
			// Case 3: This player is in the middle.
			abridged = this.topNPlayers(MAX_PLAYERS_TO_SHOW - 3);
			abridged.push(undefined);
			abridged.push([thisPlayerIndex + 1, this.players()[thisPlayerIndex]]);
			abridged.push(undefined);
		} else if (thisPlayerIndex === this.players().length - 2) {
			// Case 4: This player is second to last.
			abridged = this.topNPlayers(MAX_PLAYERS_TO_SHOW - 3);
			abridged.push(undefined);
			abridged.push([thisPlayerIndex + 1, this.players()[thisPlayerIndex]]);
			abridged.push([thisPlayerIndex + 2, this.players()[thisPlayerIndex + 1]]);
		} else {
			// Case 5: This player is last.
			abridged = this.topNPlayers(MAX_PLAYERS_TO_SHOW - 2);
			abridged.push(undefined);
			abridged.push([thisPlayerIndex + 1, this.players()[thisPlayerIndex]]);
		}
		return abridged;
	}
	
	private topNPlayers(n: number): [number, PlayerResult][] {
		return this.players().slice(0, n).map((player, index) => [index + 1, player]);
	}
}
