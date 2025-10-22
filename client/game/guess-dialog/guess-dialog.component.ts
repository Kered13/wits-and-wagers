import { Component, Directive, Inject } from "@angular/core";
import { AbstractControl, FormsModule, NG_VALIDATORS, ValidationErrors } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatError, MatInputModule } from "@angular/material/input";
import { parseFloatSafe } from "complete-common";
import { QuestionInfo } from "../../../shared/game/question";


@Directive({
	selector: "[guessValidator]",
	providers: [{ provide: NG_VALIDATORS, useExisting: GuessValidator, multi: true }]
})
export class GuessValidator {
	public validate(control: AbstractControl): ValidationErrors | null {
		const value = parseFloatSafe(control.value);
		if (value === undefined) {
			return { "notANumber": true };
		}
		return null;
	}
}


export type GuessDialogData = {
	questionInfo: QuestionInfo;
	source?: string;
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
	guess: string = "";
	question: string;
	source: string | undefined;
	date: string | undefined;
	
	
	constructor(
			private readonly dialogRef: MatDialogRef<GuessDialog>,
			@Inject(MAT_DIALOG_DATA) data: GuessDialogData) {
		this.question = data.questionInfo.question;
		this.source = data.questionInfo.source;
		this.date = data.questionInfo.date;
		dialogRef.updateSize("600px");
	}
	
	getGuess(): number | undefined {
		return parseFloatSafe(this.guess);
	}
	
	getSource(): string {
		return this.source + (this.date ? ` (${this.date})` : "");
	}
}
