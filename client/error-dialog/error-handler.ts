import { HttpErrorResponse } from "@angular/common/http";
import { ErrorHandler, Injectable, Provider, Signal } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute } from "@angular/router";
import { map, Observable, of } from "rxjs";

import { ErrorDialogComponent } from "./error-dialog.component.js";
import { toSignal } from "@angular/core/rxjs-interop";


@Injectable({ providedIn: "root" }) 
export class GlobalErrorHandler implements ErrorHandler {
	private readonly debugMode: Signal<boolean>;
	
	constructor(private readonly dialog: MatDialog, route: ActivatedRoute) {
		// TODO: For some reason the activated route is always empty, so this
		// does not work.
		this.debugMode = toSignal(
			route.queryParams.pipe(map(params => params["debug"] === "true")),
			{ initialValue: false });
	}
	
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
		if (this.debugMode()) {
			return this.dialog.open(ErrorDialogComponent, { data: error }).afterClosed();
		} else {
			return of(undefined);
		}
	}
}
