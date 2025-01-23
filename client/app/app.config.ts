import { provideHttpClient } from "@angular/common/http";
import { ApplicationConfig, InjectionToken, provideZoneChangeDetection } from "@angular/core";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideRouter } from "@angular/router";

import { ROUTES } from "../routes/routes.js";


export const SERVER_URL = new InjectionToken<string>("URL of the server.");
export const SERVER_URL_VALUE = "localhost:3000";


export const appConfig: ApplicationConfig = {
	providers: [
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideRouter(ROUTES),
		provideAnimationsAsync(),
		provideHttpClient(),
		{ provide: SERVER_URL, useValue: SERVER_URL_VALUE }
	]
};
