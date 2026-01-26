import { ChangeDetectionStrategy, Component, Inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";

import { PlayerResult, ResultsTable } from "./results-table.component";
import { SPECTATOR } from "../../../shared/color";
import { GameSpectator, type GamePlayer } from "../../../shared/game/game.js";
import { type BettingResults, type IntermissionPhaseState } from "../../../shared/game/intermission-phase.js";
import { type PublicId } from "../../../shared/player.js";


export type RoundEndDialogData = {
	intermission: IntermissionPhaseState,
	players: GamePlayer[],
	spectators: GameSpectator[],
};


@Component({
	selector: "round-end-dialog",
	imports: [MatButtonModule, MatDialogModule, ResultsTable],
	templateUrl: "./round-end-dialog.component.html",
	styleUrl: "./round-end-dialog.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoundEndDialog {
	readonly intermission: IntermissionPhaseState;
	readonly players: GamePlayer[];
	readonly spectators: GameSpectator[];
	
	constructor(@Inject(MAT_DIALOG_DATA) data: RoundEndDialogData) {
		this.intermission = data.intermission;
		this.players = data.players;
		this.spectators = data.spectators;
	}
	
	sortedResults(results: BettingResults): PlayerResult[] {
		// `Object.entries()` forgets that the keys are PublicId, so we have to
		// help the compiler out.
		return Object.entries(results.earnings)
			.map(([publicId, earnings]) => {
				const player = this.getParticipantById(publicId as PublicId);
				return {
					id: publicId as PublicId,
					name: player.name,
					color: "color" in player ? player.color : SPECTATOR,
					earnings: earnings,
					chips: player.chips,
				};
			})
			// Sort descending.
			.sort((a, b) => b.chips - a.chips);
	}
	
	getParticipantById(id: PublicId): GamePlayer | GameSpectator {
		return this.getPlayerById(id) || this.getSpectatorById(id)!;
	}
	
	getPlayerById(id: PublicId): GamePlayer | undefined {
		return this.players.find(player => player.publicId === id);
	}
	
	getSpectatorById(id: PublicId): GameSpectator | undefined {
		return this.spectators.find(spec => spec.publicId === id);
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
			return this.formatWinnerName(winnerIds[0]);
		} else if (winnerIds.length === 2) {
			return `${this.formatWinnerName(winnerIds[0])} and ${this.formatWinnerName(winnerIds[1])}`;
		} else {
			const finalName = this.formatWinnerName(winnerIds.at(-1)!);
			return winnerIds.slice(0, -1).map(id => this.formatWinnerName(id)).join(", ") + `, and ${finalName}`;
		}
	}
	
	private formatWinnerName(winnerId: PublicId): string {
		return `<b>${this.getParticipantById(winnerId).name}</b>`;
	}
}
