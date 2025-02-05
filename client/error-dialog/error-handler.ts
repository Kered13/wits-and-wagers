import { HttpErrorResponse } from "@angular/common/http";
import { ErrorHandler, Injectable } from "@angular/core";

import { ErrorDialogComponent } from "./error-dialog.component";
import { MatDialog } from "@angular/material/dialog";


@Injectable({ providedIn: "root" }) 
export class GlobalErrorHandler implements ErrorHandler {
	constructor(private readonly dialog: MatDialog) {}
	
	public handleError(error: unknown): void {
		// For some reason HttpErrorResponse is not a subclass of Error.
		if (!(error instanceof Error) && !(error instanceof HttpErrorResponse)) {
			this.handle(new Error("Unknown error: ", { cause: error }));
			return;
		}
		this.handle(error);
	}
	
	private handle(error: Error): void {
		console.error(error);
		this.dialog.open(ErrorDialogComponent, { data: error });
	}
}
