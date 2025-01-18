import { RedirectCommand, ResolveFn, Router, Routes } from "@angular/router";

import { GameComponent } from "../game/game.component";
import { HomeComponent } from "../home/home.component";
import { HostComponent } from "../host/host.component";
import { LobbyComponent } from "../lobby/lobby.component";
import { inject } from "@angular/core";


const getLocalStorageKey = (key: string): ResolveFn<string> => {
	return () =>
		localStorage.getItem(key) || new RedirectCommand(inject(Router).createUrlTree([]));
};

const getLocalStorage = (...keys: string[]): { [key: string]: ResolveFn<string> } => {
	return Object.fromEntries(keys.map(key => [key, getLocalStorageKey(key)]));
};


export const routes: Routes = [
	{
		title: "Wits & Wagers",
		path: "",
		component: HomeComponent
	},
	{
		title: "Wits & Wagers - Host Game",
		path: "host",
		component: HostComponent,
		resolve: { ...getLocalStorage("username") }
	},
	{
		title: "Wits & Wagers",
		path: "lobby/:lobbyId",
		component: LobbyComponent,
		resolve: { ...getLocalStorage("username", "publicId", "privateId") }
	},
	{
		title: "Wits & Wagers",
		path: "game/:gameId",
		component: GameComponent,
		resolve: { ... getLocalStorage("username", "publicId", "privateId") }
	}
];
