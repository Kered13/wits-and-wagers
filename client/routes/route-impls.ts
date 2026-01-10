import { EnvironmentProviders, Injectable, Provider } from "@angular/core";
import { Routes, provideRouter as ngProvideRouter } from "@angular/router";

import { getLocalStorage, resolveGame, resolveLobby } from "./resolvers.js";
import { GameRoute, HomeRoute, HostRoute, LobbyRoute } from "./routes.js";
import { USERNAME } from "../app/localstorage.keys.js";
import { GameComponent } from "../game/common/game.component.js";
import { HomeComponent } from "../home/home.component.js";
import { HostComponent } from "../host/host.component.js";
import { LobbyComponent } from "../lobby/lobby.component.js";


@Injectable({ providedIn: "root" })
export class HomeRouteImpl extends HomeRoute {
	constructor() {
		super({
			title: "Wits & Wagers",
			path: "",
			component: HomeComponent
		});
	}
}


@Injectable({ providedIn: "root" })
export class HostRouteImpl extends HostRoute {
	constructor() {
		super({
			title: "Wits & Wagers - Host Game",
			path: "host",
			component: HostComponent,
			resolve: { ...getLocalStorage(USERNAME) }
		});
	}
}


@Injectable({ providedIn: "root" })
export class LobbyRouteImpl extends LobbyRoute {
	constructor() {
		super({
			title: "Wits & Wagers",
			path: "lobby/:lobbyId",
			component: LobbyComponent,
			resolve: { player: resolveLobby }
		});
	}
}


@Injectable({ providedIn: "root" })
export class GameRouteImpl extends GameRoute {
	constructor() {
		super({
			title: "Wits & Wagers",
			path: "game/:gameId",
			component: GameComponent,
			resolve: { player: resolveGame }
		});
	}
}


export function provideRoutes(): Provider[] {
	return [
		{ provide: HomeRoute, useClass: HomeRouteImpl },
		{ provide: HostRoute, useClass: HostRouteImpl },
		{ provide: GameRoute, useClass: GameRouteImpl },
		{ provide: LobbyRoute, useClass: LobbyRouteImpl }
	];
}


export function provideRouter(): EnvironmentProviders {
	const routes: Routes = [new HomeRouteImpl(), new HostRouteImpl(), new LobbyRouteImpl(), new GameRouteImpl()].map(route => route.route);
	routes.push({ path: "**", redirectTo: "" });
	return ngProvideRouter(routes);
}
