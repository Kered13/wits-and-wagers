import { ChangeDetectionStrategy, Component, HostListener, Inject, } from "@angular/core";
import { AbstractControl, FormControl, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatError, MatInputModule } from "@angular/material/input";
import { parseIntSafe } from "complete-common";


function chipValidator(availableChips: number): ValidatorFn {
	return function validate(control: AbstractControl): ValidationErrors | null {
		const value = parseIntSafe(control.value);
		if (value === undefined) {
			return { "notAnInteger": true };
		} else if (value < 0) {
			return { "mustBeNonNegative": true };
		} else if (value > availableChips) {
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
		FormsModule,
		MatButtonModule,
		MatDialogModule,
		MatError,
		MatInputModule,
		ReactiveFormsModule,
	],
	templateUrl: "./wager-dialog.component.html",
	styleUrl: "./wager-dialog.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WagerDialog {
	readonly wager = new FormControl("", Validators.required);
	
	constructor(
			private readonly dialogRef: MatDialogRef<WagerDialog>,
			@Inject(MAT_DIALOG_DATA) readonly data: WagerDialogData) {
		this.wager.addValidators(chipValidator(this.getAvailableChips()));
		this.wager.setValue(this.data.existingWager?.toString() ?? "");
	}
	
	@HostListener("keydown.enter", ["$event"])
	submit(event: Event) {
		if (this.wager.valid) {
			this.dialogRef.close(this.getWager());
		}
		event.stopPropagation();
	}
	
	getWager(): number | undefined {
		return parseIntSafe(this.wager.value ?? "");
	}
	
	getAvailableChips(): number {
		return this.data.availableChips + (this.data.existingWager ?? 0);
	}
}
