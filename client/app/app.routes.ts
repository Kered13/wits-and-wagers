import { inject } from "@angular/core";
import { RedirectCommand, ResolveFn, Router, Routes } from "@angular/router";

import { PRIVATE_ID, PUBLIC_ID, USERNAME } from "./localstorage.keys.js";
import { GameComponent } from "../game/game.component.js";
import { HomeComponent } from "../home/home.component.js";
import { HostComponent } from "../host/host.component.js";
import { LobbyComponent } from "../lobby/lobby.component.js";


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
		resolve: { ...getLocalStorage(USERNAME) }
	},
	{
		title: "Wits & Wagers",
		path: "lobby/:lobbyId",
		component: LobbyComponent,
		resolve: { ...getLocalStorage(USERNAME, PUBLIC_ID, PRIVATE_ID) }
	},
	{
		title: "Wits & Wagers",
		path: "game/:gameId",
		component: GameComponent,
		resolve: { ...getLocalStorage(USERNAME, PUBLIC_ID, PRIVATE_ID) }
	}
];
