import { inject, Type } from "@angular/core";
import { Data, Params, RedirectCommand, Resolve, ResolveFn, Route, Router, Routes } from "@angular/router";
import { TypedRoute as TypedActivatedRoute } from "ngx-typed-router";

import { PRIVATE_ID, PUBLIC_ID, USERNAME } from "../app/localstorage.keys.js";
import { GameComponent } from "../game/game.component.js";
import { HomeComponent } from "../home/home.component.js";
import { HostComponent } from "../host/host.component.js";
import { LobbyComponent } from "../lobby/lobby.component.js";
import { LobbyId } from "../../shared/lobby/lobby.js";
import { GameId } from "../../shared/game/game.js";


type IsUnion<T, U = T> = T extends T ? [U] extends [T] ? false : true : never;
type StringLiteral<S extends string> = string extends S ? never : IsUnion<S> extends false ? S : never;
type StringLiterals<S extends string[]> = { [I in keyof S]: StringLiteral<S[I]> };

function getLocalStorageKey(key: string): ResolveFn<string> {
	return () =>
		localStorage.getItem(key) || new RedirectCommand(inject(Router).createUrlTree(HOME_ROUTE.url()));
};

function getLocalStorage<S extends string[]>(...keys: StringLiterals<S>): { [K in S[number]]: ResolveFn<string> } {
	return Object.fromEntries(keys.map(key => [key, getLocalStorageKey(key)])) as { [K in S[number]]: ResolveFn<string> };
};


// ResolveConfig from ngs-typed-router does not support ResolveFn, so we use
// our own instead.
type ResolveConfig<T> = {
	[P in keyof T]: ResolveFn<T[P]> | {
		new(...args: any[]): Resolve<T[P]>;
	};
};

type TypedRoute<D extends Data = {}> = Route & {
	title: string,
	path: string,
	component: Type<any>,
	resolve?: ResolveConfig<D>
};


class AppRoute<D extends Data = {}, P extends Params = {}, Q extends Params = {}> {
	private readonly components: string[];
	
	// This is needed to differentiate instantiations. It allows type inference
	// in TypedRouteFor to work correctly.
	private readonly _: TypedActivatedRoute<D, P, Q> | undefined;
	
	constructor(public readonly route: TypedRoute<D>) {
		this.components = this.route.path.split("/");
	}
	
	public url(params: P): string[] {
		return this.components.map(component => {
			if (component.startsWith(":")) {
				return params[component.substring(1)];
			} else {
				return component;
			}
		});
	}
}

// Adds a path() method with no parameters.
class AppRouteNoParams<D extends Data = {}> extends AppRoute<D> {
	public override url(_: {} = {}): string[] {
		return super.url({});
	}
}


type HasUsername = {
	username: string;
};

type HasPlayerIds = {
	publicId: string,
	privateId: string;
};

type HasLobbyId = {
	lobbyId: LobbyId;
};

type HasGameId = {
	gameId: GameId;
};


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


export class LobbyRoute extends AppRoute<HasUsername & HasPlayerIds, HasLobbyId> {
	constructor() {
		super({
			title: "Wits & Wagers",
			path: "lobby/:lobbyId",
			component: LobbyComponent,
			resolve: { ...getLocalStorage(USERNAME, PUBLIC_ID, PRIVATE_ID) }
		});
	}
}
export const LOBBY_ROUTE = new LobbyRoute();


export class GameRoute extends AppRoute<HasUsername & HasPlayerIds, HasGameId> {
	constructor() {
		super({
			title: "Wits & Wagers",
			path: "game/:gameId",
			component: GameComponent,
			resolve: { ...getLocalStorage(USERNAME, PUBLIC_ID, PRIVATE_ID) }
		});
	}
}
export const GAME_ROUTE = new GameRoute();


export const ROUTES: Routes = [HOME_ROUTE, HOST_ROUTE, LOBBY_ROUTE, GAME_ROUTE]
	.map(route => route.route);


export type TypedRouteFor<R> =
	R extends AppRoute<infer D, infer P, infer Q> ? TypedActivatedRoute<D, P, Q> : never;
