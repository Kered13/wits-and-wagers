import { Routes } from "@angular/router";
import { TypedRoute as TypedActivatedRoute } from "ngx-typed-router";

import { getLocalStorage, resolveGame, resolveLobby } from "./resolvers.js";
import { HasGameId, HasLobbyId, HasPlayer, HasUsername } from "./types.js";
import { AppRoute, AppRouteNoParams } from "./utils.js";
import { USERNAME } from "../app/localstorage.keys.js";
import { GameComponent } from "../game/game.component.js";
import { HomeComponent } from "../home/home.component.js";
import { HostComponent } from "../host/host.component.js";
import { LobbyComponent } from "../lobby/lobby.component.js";


export class HomeRoute extends AppRouteNoParams {
	constructor() {
		super({
			title: "Wits & Wagers",
			path: "",
			component: HomeComponent
		});
	}
}
export const HOME_ROUTE = new HomeRoute();


export class HostRoute extends AppRouteNoParams<HasUsername> {
	constructor() {
		super({
			title: "Wits & Wagers - Host Game",
			path: "host",
			component: HostComponent,
			resolve: { ...getLocalStorage(USERNAME) }
		});
	}
}
export const HOST_ROUTE = new HostRoute();


export class LobbyRoute extends AppRoute<HasPlayer, HasLobbyId> {
	constructor() {
		super({
			title: "Wits & Wagers",
			path: "lobby/:lobbyId",
			component: LobbyComponent,
			resolve: { player: resolveLobby }
		});
	}
}
export const LOBBY_ROUTE = new LobbyRoute();


export class GameRoute extends AppRoute<HasPlayer, HasGameId> {
	constructor() {
		super({
			title: "Wits & Wagers",
			path: "game/:gameId",
			component: GameComponent,
			resolve: { player: resolveGame }
		});
	}
}
export const GAME_ROUTE = new GameRoute();


export const ROUTES: Routes = [HOME_ROUTE, HOST_ROUTE, LOBBY_ROUTE, GAME_ROUTE].map(route => route.route);
ROUTES.push({ path: "**", redirectTo: "" });


export type TypedRouteFor<R> =
	R extends AppRoute<infer D, infer P, infer Q> ? TypedActivatedRoute<D, P, Q> : never;
