import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { Ng2FittextModule } from "ng2-fittext";


@Component({
	selector: "spectator-chip",
	imports: [Ng2FittextModule],
	templateUrl: "./spectator-chip.component.html",
	styleUrls: ["./spectator-chip.component.css"],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectatorChip {
	readonly value = input.required<number>();
	readonly name = input.required<string>();
	
	getAbbrName(): string {
		return this.name().substring(0, 5);
	}
}
