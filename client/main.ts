import { provideHttpClient } from "@angular/common/http";
import { ApplicationConfig, ErrorHandler, InjectionToken, provideZoneChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideRouter } from "@angular/router";

import { SERVER_URL, SERVER_URL_VALUE } from "./app/flags.js";
import { GlobalErrorHandler } from "./error-dialog/error-handler.js";
import { AppComponent } from "./root/root.component.js";
import { ROUTES } from "./routes/routes.js";


export const appConfig: ApplicationConfig = {
	providers: [
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideRouter(ROUTES),
		provideAnimationsAsync(),
		provideHttpClient(),
		{ provide: ErrorHandler, useClass: GlobalErrorHandler },
		{ provide: SERVER_URL, useValue: SERVER_URL_VALUE }
	]
};


bootstrapApplication(AppComponent, appConfig)
	.catch((err) => console.error(err));
