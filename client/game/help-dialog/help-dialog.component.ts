import { ChangeDetectionStrategy, Component, Inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";


export type HelpDialogData = {
	phase: "question" | "betting",
}


@Component({
	selector: "help-dialog",
	imports: [MatButtonModule, MatDialogModule],
	templateUrl: "./help-dialog.component.html",
	styleUrl: "./help-dialog.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpDialog {
	constructor(@Inject(MAT_DIALOG_DATA) readonly data: HelpDialogData) {}
}
