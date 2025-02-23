import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import { BettingConclusion, EndRound, GamePlayerJson } from '../../shared/game/game.js';
import { PublicId } from '../../shared/player.js';


@Component({
	selector: 'round-end-dialog',
	imports: [MatButtonModule, MatDialogModule],
	templateUrl: './round-end-dialog.component.html',
	styleUrl: './round-end-dialog.component.css'
})
export class RoundEndDialogComponent {
	readonly endRound: EndRound;
	readonly players: GamePlayerJson[];
	
	constructor(@Inject(MAT_DIALOG_DATA) data: { endRound: EndRound, players: GamePlayerJson[] }) {
		this.endRound = data.endRound;
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
	
	private getNameForPlayer(id: PublicId): string {
		return this.players.find(player => player.publicId === id)!.name;
	}
}
