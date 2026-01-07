import { ChangeDetectionStrategy, Component, Signal } from "@angular/core";
import { BreakpointObserver } from "@angular/cdk/layout";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";

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
export class GameComponent {
	readonly isMobile: Signal<boolean>;
	
	constructor(private readonly breakpointObserver: BreakpointObserver) {
		this.isMobile = toSignal(
			this.breakpointObserver.observe("(max-aspect-ratio: 1/1)").pipe(
				map(result => result.matches)),
			{ initialValue: false });
	}
}
