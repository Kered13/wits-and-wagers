import { Component, Directive, DOCUMENT, Inject } from "@angular/core";
import { AbstractControl, FormsModule, NG_VALIDATORS, ValidationErrors } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatError, MatInputModule } from "@angular/material/input";
import { parseIntSafe } from "complete-common";


@Directive({
	selector: "[guessValidator]",
	providers: [{ provide: NG_VALIDATORS, useExisting: GuessValidator, multi: true }]
})
export class GuessValidator {
	public validate(control: AbstractControl): ValidationErrors | null {
		const value = parseIntSafe(control.value);
		if (value === undefined || value <= 0) {
			return { "notAPositiveWholeNumber": true };
		}
		return null;
	}
}


export type GuessDialogData = {
	initialPosition: number;
	currentGuess?: number;
};


@Component({
	selector: "guess-dialog",
	imports: [
		GuessValidator,
		FormsModule,
		MatButtonModule,
		MatDialogModule,
		MatError,
		MatInputModule,
	],
	templateUrl: "./guess-dialog.component.html",
	styleUrl: "./guess-dialog.component.css"
})
export class GuessDialog {
	currentGuess: number | undefined;
	guess: string;
	
	// The vertical position of this dialog.
	private position: number = 0;
	// The last scroll position of the document.
	private lastScroll: number = 0;
	
	
	constructor(
			private readonly dialogRef: MatDialogRef<GuessDialog>,
			@Inject(DOCUMENT) private readonly document: Document,
			@Inject(MAT_DIALOG_DATA) data: GuessDialogData) {
		this.currentGuess = data.currentGuess;
		this.guess = this.currentGuess?.toString() ?? "";
		
		// Update the position to keep the dialog fixed relative to the
		// document. This is an unfortunate workaround since MatDialog does not
		// support this type of positioning.
		const window = this.document.defaultView;
		this.initializePosition(data.initialPosition, window?.scrollY ?? 0);
		this.document.addEventListener("scroll", event => {
			this.updatePosition(window?.scrollY ?? 0);
		});
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
		return parseIntSafe(this.guess);
	}
}
