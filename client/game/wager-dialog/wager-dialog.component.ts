import { Component, Directive, Inject, input } from "@angular/core";
import { AbstractControl, FormsModule, NG_VALIDATORS, ValidationErrors } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatError, MatInputModule } from "@angular/material/input";
import { parseIntSafe } from "complete-common";


@Directive({
	selector: "[chipValidator]",
	providers: [{ provide: NG_VALIDATORS, useExisting: ChipValidator, multi: true }]
})
export class ChipValidator {
	readonly availableChips = input.required<number>({ alias: "chipValidator" });
	
	public validate(control: AbstractControl): ValidationErrors | null {
		const value = parseIntSafe(control.value);
		if (value === undefined) {
			return { "notAnInteger": true };
		} else if (value < 0) {
			return { "mustBeNonNegative": true };
		} else if (value > this.availableChips()) {
			return { "insufficientChips": true };
		}
		return null;
	}
}


export type WagerDialogData = {
	availableChips: number;
	existingWager?: number;
};


@Component({
	selector: "wager-dialog",
	imports: [
		ChipValidator,
		FormsModule,
		MatButtonModule,
		MatDialogModule,
		MatError,
		MatInputModule,
	],
	templateUrl: "./wager-dialog.component.html",
	styleUrl: "./wager-dialog.component.css"
})
export class WagerDialog {
	wager: string = ""
	
	constructor(
			private readonly dialogRef: MatDialogRef<WagerDialog>,
			@Inject(MAT_DIALOG_DATA) readonly data: WagerDialogData) {
		dialogRef.updateSize("355px", "235px");
	}
	
	getWager(): number | undefined {
		return parseIntSafe(this.wager);
	}
	
	getAvailableChips(): number {
		return this.data.availableChips + (this.data.existingWager ?? 0);
	}
}
