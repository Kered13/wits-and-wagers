import { ChangeDetectionStrategy, Component, Inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";

import { PlayerResult, ResultsTable } from "./results-table.component";
import { SPECTATOR } from "../../../shared/color";
import { GameSpectator, type GamePlayer } from "../../../shared/game/game.js";
import { type PublicId } from "../../../shared/player.js";


export type GameOverDialogData = {
	players: GamePlayer[],
	spectators: GameSpectator[],
	thisParticipant: PublicId,
};


@Component({
	selector: "game-over-dialog",
	imports: [MatButtonModule, MatDialogModule, ResultsTable],
	templateUrl: "./game-over-dialog.component.html",
	styleUrl: "./game-over-dialog.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameOverDialog {
	readonly players: GamePlayer[];
	readonly spectators: GameSpectator[];
	readonly thisParticipant: PublicId;
	
	constructor(@Inject(MAT_DIALOG_DATA) data: GameOverDialogData) {
		this.players = data.players;
		this.spectators = data.spectators;
		this.thisParticipant = data.thisParticipant;
	}
	
	sortedResults(players: (GamePlayer | GameSpectator)[]): PlayerResult[] {
		// `Object.entries()` forgets that the keys are PublicId, so we have to
		// help the compiler out.
		return players.map(player => {
				return {
					id: player.publicId,
					name: player.name,
					color: "color" in player ? player.color : SPECTATOR,
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
}
