import { MatMiniFabButton } from "@angular/material/button";
import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { MatIcon } from "@angular/material/icon";
import { MatTooltip } from "@angular/material/tooltip";

import { ColorPicker } from "../color-picker/color-picker.component.js";
import { LobbyInstanceService } from "../lobby.service.js";
import { Color, COLORS, SPECTATOR } from "../../../shared/color.js";
import { LobbyPlayer, LobbySpectator } from "../../../shared/lobby/lobby.js";
import { PublicId } from "../../../shared/player.js";


type Participant = {
	publicId: PublicId;
	name: string;
	color?: Color;
};


@Component({
	selector: "player-list",
	imports: [ColorPicker, MatMiniFabButton, MatIcon, MatTooltip],
	templateUrl: "./player-list.component.html",
	styleUrl: "./player-list.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerList {
	readonly lobbyService = input.required<LobbyInstanceService>();
	readonly participants = input.required<Participant[]>();
	readonly thisParticipant = input.required<PublicId>();
	readonly host = input.required<PublicId>();
	readonly type = input.required<"players" | "spectators">();
	readonly disableMove = input<boolean>(false);
	
	readonly availableColors = computed(() => {
		let colors = new Set(COLORS);
		for (const participant of this.participants()) {
			if (participant.color) {
				colors.delete(participant.color);
			}
		}
		return colors;
	});
	
	getHeader(): string {
		return this.type() === "players" ? "Players" : "Spectators";
	}
	
	isHost(participant: PublicId): boolean {
		return participant === this.host();
	}
	
	isThisPlayerHost(): boolean {
		return this.isHost(this.thisParticipant());
	}
	
	isPlayer(participant: LobbyPlayer | LobbySpectator): participant is LobbyPlayer {
		return "color" in participant;
	}
	
	moveTooltip(): string {
		return `Move to ${ this.type() === "players" ? "spectators" : "players" }`;
	}
	
	moveParticipant(player: PublicId): void {
		if (!this.isThisPlayerHost()) {
			return;
		}
		const target = this.type() === "players" ? "spectator" : "player";
		this.lobbyService().movePlayer(player, target).subscribe();
	}
	
	kickPlayer(player: PublicId): void {
		if (this.isThisPlayerHost()) {
			this.lobbyService().kickPlayer(player).subscribe();
		}
	}
	
	spectatorColor(): string {
		return SPECTATOR;
	}
}
