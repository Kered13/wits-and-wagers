import { InjectionToken, Provider } from "@angular/core";

import { SERVER_URL_VALUE } from "./environment.js";


export const SERVER_URL = new InjectionToken<string>("URL of the server.");
export function provideServerUrl(): Provider {
	return { provide: SERVER_URL, useValue: SERVER_URL_VALUE };
}
