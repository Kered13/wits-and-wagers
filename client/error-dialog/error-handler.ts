import { HttpErrorResponse } from "@angular/common/http";
import { ErrorHandler, Injectable, Provider } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Observable } from "rxjs";

import { ErrorDialogComponent } from "./error-dialog.component.js";


@Injectable({ providedIn: "root" }) 
export class GlobalErrorHandler implements ErrorHandler {
	constructor(private readonly dialog: MatDialog) {}
	
	public static provideErrorHandler(): Provider {
		return { provide: ErrorHandler, useClass: GlobalErrorHandler };
	}
	
	// Returns a subject that will notify and complete when the error dialog is
	// closed.
	public handleError(error: unknown): Observable<any> {
		// For some reason HttpErrorResponse is not a subclass of Error.
		if (!(error instanceof Error) && !(error instanceof HttpErrorResponse)) {
			if (error instanceof Object) {
				return this.handle(new Error(`Unknown error: ${error} | ${JSON.stringify(error)}`, { cause: error }));
			} else {
				return this.handle(new Error(`Unknown error: ${error}`, { cause: error }));
			}
		}
		return this.handle(error);
	}
	
	private handle(error: Error): Observable<any> {
		console.error(error);
		return this.dialog.open(ErrorDialogComponent, { data: error }).afterClosed();
	}
}
