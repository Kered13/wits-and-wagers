import { Component, Inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";


@Component({
	selector: "global-error-dialog",
	imports: [MatButtonModule, MatDialogModule],
	templateUrl: "./error-dialog.component.html",
	styleUrl: "./error-dialog.component.css"
})
export class ErrorDialogComponent {
	constructor(@Inject(MAT_DIALOG_DATA) readonly error: Error) {}
	
	hasStatusProperty(error: Error): error is Error & { status: number } {
		return "status" in error;
	}
}
