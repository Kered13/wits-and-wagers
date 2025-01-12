import { Routes } from "@angular/router";

import { GameComponent } from "../game/game.component";
import { HomeComponent } from "../home/home.component";
import { HostComponent } from "../host/host.component";


export const routes: Routes = [
	{ title: "Wits & Wagers", path: "", component: HomeComponent },
	{ title: "Wits & Wagers - Host Game", path: "host", component: HostComponent },
	{ title: "Wits & Wagers", path: "game/:gameId", component: GameComponent }
];
