import { ChangeDetectionStrategy, Component } from "@angular/core";

import { GameComponent } from "./common/game.component.js";
import { OrientationObserver } from "./orientation-observer.js";


@Component({
	selector: "app-game",
	imports: [
		GameComponent,
	],
	templateUrl: "./game.component.html",
	styleUrl: "./game.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameComponent2 {
	constructor(readonly orientation: OrientationObserver) {}
}
