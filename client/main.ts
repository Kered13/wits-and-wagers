import { bootstrapApplication } from "@angular/platform-browser";

import { appConfig } from "./app/app.config.js";
import { AppComponent } from "./root/root.component.js";


bootstrapApplication(AppComponent, appConfig)
	.catch((err) => console.error(err));
