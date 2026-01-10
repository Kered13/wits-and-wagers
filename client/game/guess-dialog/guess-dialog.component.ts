import { ChangeDetectionStrategy, Component, DOCUMENT, HostListener, Inject } from "@angular/core";
import { AbstractControl, FormControl, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatError, MatInputModule } from "@angular/material/input";
import { parseIntSafe } from "complete-common";

import { WITHDRAW } from "../../../shared/game/submit-guess";


function validateGuess(control: AbstractControl): ValidationErrors | null {
	const value = parseIntSafe(control.value);
	if (value === undefined || value <= 0) {
		return { "notAPositiveWholeNumber": true };
	}
	return null;
}


export type GuessDialogData = {
	initialPosition: number;
	currentGuess?: number;
};


@Component({
	selector: "guess-dialog",
	imports: [
		FormsModule,
		MatButtonModule,
		MatDialogModule,
		MatError,
		MatInputModule,
		ReactiveFormsModule,
	],
	templateUrl: "./guess-dialog.component.html",
	styleUrl: "./guess-dialog.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuessDialog {
	readonly currentGuess: number | undefined;
	readonly guess = new FormControl("", [Validators.required, validateGuess]);
	
	// The vertical position of this dialog.
	private position: number = 0;
	// The last scroll position of the document.
	private lastScroll: number = 0;
	
	constructor(
			private readonly dialogRef: MatDialogRef<GuessDialog>,
			@Inject(DOCUMENT) private readonly document: Document,
			@Inject(MAT_DIALOG_DATA) data: GuessDialogData) {
		this.currentGuess = data.currentGuess;
		this.guess.setValue(this.currentGuess?.toString() ?? "");
		
		// Update the position to keep the dialog fixed relative to the
		// document. This is an unfortunate workaround since MatDialog does not
		// support this type of positioning.
		const window = this.document.defaultView;
		this.initializePosition(data.initialPosition, window?.scrollY ?? 0);
		this.document.addEventListener("scroll", event => {
			this.updatePosition(window?.scrollY ?? 0);
		});
	}
	
	@HostListener("keyup.enter", ["$event"])
	submit(event: Event) {
		if (this.guess.valid) {
			this.dialogRef.close(this.getGuess());
		}
		event.stopPropagation();
	}
	
	private initializePosition(position: number, scroll: number): void {
		this.position = position;
		this.lastScroll = scroll;
		this.refreshDialogPosition();
	}
	
	private updatePosition(newScroll: number): void {
		const scrollDelta = newScroll - this.lastScroll;
		this.lastScroll = newScroll;
		this.position -= scrollDelta;
		this.refreshDialogPosition();
	}
	
	private refreshDialogPosition(): void {
		this.dialogRef.updatePosition({ top: this.position + "px" });
	}
	
	getGuess(): number | undefined {
		return parseIntSafe(this.guess.value ?? "");
	}
	
	withdraw(): typeof WITHDRAW {
		return WITHDRAW;
	}
}
