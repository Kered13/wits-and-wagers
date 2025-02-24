import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import { GameState } from '../../shared/game/game.js';


@Component({
	selector: 'game-end-dialog',
	imports: [MatButtonModule, MatDialogModule],
	templateUrl: './game-end-dialog.component.html',
	styleUrl: './game-end-dialog.component.css'
})
export class GameEndDialogComponent {
	constructor(@Inject(MAT_DIALOG_DATA) readonly game: GameState) {}
	
	rankedPlayersStr(): string {
		return this.game.players.map(player => `${player.name}: ${player.chips}`).join("\n");
	}
}
