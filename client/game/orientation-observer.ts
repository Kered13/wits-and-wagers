import { BreakpointObserver } from "@angular/cdk/layout";
import { computed, Injectable, Signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";


export enum Orientation {
	PORTRAIT,
	LANDSCAPE,
};


@Injectable({ providedIn: "root" })
export class OrientationObserver {
	public readonly orientation: Signal<Orientation>;
	public readonly isLandscape: Signal<boolean> = computed(() => this.orientation() === Orientation.LANDSCAPE);
	public readonly isPortrait: Signal<boolean> = computed(() => this.orientation() === Orientation.PORTRAIT);
	
	constructor(private readonly breakpointObserver: BreakpointObserver) {
		this.orientation = toSignal(
			this.breakpointObserver.observe("(orientation: landscape)").pipe(
				map(result => result.matches ? Orientation.LANDSCAPE : Orientation.PORTRAIT)),
			{ initialValue: Orientation.PORTRAIT });
	}
}
