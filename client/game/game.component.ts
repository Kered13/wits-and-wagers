import { ChangeDetectionStrategy, Component } from "@angular/core";

import { DesktopGameComponent } from "./desktop/desktop-game.component.js";
import { MobileGameComponent } from "./mobile/mobile-game.component.js";


@Component({
	selector: "app-game",
	imports: [
		DesktopGameComponent,
		MobileGameComponent,
	],
	templateUrl: "./game.component.html",
	styleUrl: "./game.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameComponent { }
