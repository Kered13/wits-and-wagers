import { HttpErrorResponse } from "@angular/common/http";
import { ErrorHandler, Injectable, Provider } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";

import { ErrorDialogComponent } from "./error-dialog.component.js";


@Injectable({ providedIn: "root" }) 
export class GlobalErrorHandler implements ErrorHandler {
	constructor(private readonly dialog: MatDialog) {}
	
	public static provideErrorHandler(): Provider {
		return { provide: ErrorHandler, useClass: GlobalErrorHandler };
	}
	
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
