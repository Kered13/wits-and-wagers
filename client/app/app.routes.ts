import { Routes } from "@angular/router";

import { GameComponent } from "../game/game.component";
import { HomeComponent } from "../home/home.component";
import { HostComponent } from "../host/host.component";


export const routes: Routes = [
	{ path: "", component: HomeComponent },
	{ path: "host", component: HostComponent },
	{ path: "game", component: GameComponent }
];
