import { Component, Inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";

import { type GamePlayer } from "../../shared/game/game.js";
import { type BettingConclusion, type IntermissionPhaseState } from "../../shared/game/intermission-phase.js";
import { type PublicId } from "../../shared/player.js";


@Component({
	selector: "round-end-dialog",
	imports: [MatButtonModule, MatDialogModule],
	templateUrl: "./round-end-dialog.component.html",
	styleUrl: "./round-end-dialog.component.css"
})
export class RoundEndDialog {
	readonly intermission: IntermissionPhaseState;
	readonly players: GamePlayer[];
	
	constructor(@Inject(MAT_DIALOG_DATA) data: { intermission: IntermissionPhaseState, players: GamePlayer[] }) {
		this.intermission = data.intermission;
		this.players = data.players;
	}
	
	earnings(conclusion: BettingConclusion): { id: PublicId, name: string, earnings: number }[] {
		return Object.entries(conclusion.earnings)
			.map(([publicId, earnings]) => ({
				id: publicId,
				name: this.getNameForPlayer(publicId),
				earnings: earnings
			}));
	}
	
	getNameForPlayer(id: PublicId): string {
		return this.players.find(player => player.publicId === id)!.name;
	}
	
	formatWinners(winnerIds: PublicId[]): string {
		if (winnerIds.length === 0) {
			return "All guesses were too high!";
		} else {
			return `${this.formatWinnerNames(winnerIds)} had the closest answer!`;
		}
	}
	
	private formatWinnerNames(winnerIds: PublicId[]): string {
		if(winnerIds.length === 1) {
			return this.getNameForPlayer(winnerIds[0]);
		} else if (winnerIds.length === 2) {
			return `${this.getNameForPlayer(winnerIds[0])} and ${this.getNameForPlayer(winnerIds[1])}`;
		} else {
			const finalName = this.getNameForPlayer(winnerIds.at(-1)!);
			return winnerIds.slice(0, -1).map(id => this.getNameForPlayer(id)).join(", ") + `, and ${finalName}`;
		}
	}
}
