import { ChangeDetectionStrategy, Component } from "@angular/core";

import { DesktopGameComponent } from "./desktop/game.component.js";


@Component({
	selector: "app-game",
	imports: [
		DesktopGameComponent
	],
	templateUrl: "./game.component.html",
	styleUrl: "./game.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameComponent { }
