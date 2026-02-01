import { OverlayModule } from "@angular/cdk/overlay";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { MatMiniFabButton } from "@angular/material/button";
import { MatTooltip } from "@angular/material/tooltip";

import { ColorButton } from "../color-button/color-button.component";
import { LobbyInstanceService } from "../lobby.service";
import { Color, COLORS } from "../../../shared/color";
import { LobbyPlayer } from "../../../shared/lobby/lobby";


@Component({
	selector: "color-picker",
	imports: [ColorButton, MatMiniFabButton, MatTooltip, OverlayModule],
	templateUrl: "./color-picker.component.html",
	styleUrl: "./color-picker.component.scss",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPicker {
	readonly player = input.required<LobbyPlayer>();
	readonly lobbyService = input.required<LobbyInstanceService>();
	readonly availableColors = input.required<Set<Color>>();
	readonly disabled = input<boolean>(false);
	
	readonly COLORS = COLORS;
	
	isOpen: boolean = false;
	
	setColor(color: Color): void {
		if (color === this.player().color) {
			return;
		}
		this.lobbyService().setColor(this.player().publicId, color).subscribe();
	}
	
	isColorAvailable(color: Color): boolean {
		return this.availableColors().has(color);
	}
	
	toggleColorPicker(): void {
		this.isOpen = !this.isOpen;
	}
	
	closeColorPicker(): void {
		this.isOpen = false;
	}
}
