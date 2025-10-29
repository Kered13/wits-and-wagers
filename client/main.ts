import { provideHttpClient } from "@angular/common/http";
import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";

import { provideServerUrl } from "./app/flags.js";
import { GlobalErrorHandler } from "./error-dialog/error-handler.js";
import { AppComponent } from "./root/root.component.js";
import { provideRouter, provideRoutes } from "./routes/route-impls.js";


const appConfig: ApplicationConfig = {
	providers: [
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideAnimationsAsync(),
		provideHttpClient(),
		provideRouter(),
		provideRoutes(),
		GlobalErrorHandler.provideErrorHandler(),
		provideServerUrl(),
	]
};


bootstrapApplication(AppComponent, appConfig)
	.catch((err) => console.error(err));
