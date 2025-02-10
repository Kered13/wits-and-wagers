import { inject } from "@angular/core";
import { RedirectCommand, Router } from "@angular/router";
import { TypedRouteSnapshot as TypedActivatedRouteSnapshot } from "ngx-typed-router";
import { firstValueFrom } from "rxjs";

import { GameRoute, HomeRoute } from "./routes.js";
import { HasGameId, HasLobbyId, HasPlayer } from "./types.js";
import { ResolveFn, StringLiterals } from "./utils.js";
import { GAME_ID, PRIVATE_ID, PUBLIC_ID, USERNAME } from "../app/localstorage.keys.js";
import { LobbyService } from "../lobby/lobby.service.js";
import { PrivatePlayer } from "../../shared/player.js";


function getLocalStorageKey(key: string): ResolveFn<string> {
	return () =>
		localStorage.getItem(key) || new RedirectCommand(inject(Router).createUrlTree(inject(HomeRoute).url()));
};

export function getLocalStorage<S extends string[]>(...keys: StringLiterals<S>): { [K in S[number]]: ResolveFn<string> } {
	return Object.fromEntries(keys.map(key => [key, getLocalStorageKey(key)])) as { [K in S[number]]: ResolveFn<string> };
};


export async function resolveLobby(route: TypedActivatedRouteSnapshot<HasPlayer, HasLobbyId>): Promise<PrivatePlayer | RedirectCommand> {
	// Always set the GAME_ID. This way if we get redirected by to the
	// homepage, it will be remembered.
	const lobbyId = route.params.lobbyId;
	localStorage.setItem(GAME_ID, lobbyId);
	
	// We have to get the router before we call await below.
	const router = inject(Router);
	
	const username = localStorage.getItem(USERNAME);
	if (!username) {
		return new RedirectCommand(router.createUrlTree(inject(HomeRoute).url()));
	}
	
	const privateId = localStorage.getItem(PRIVATE_ID) ?? undefined;
	const response = await firstValueFrom(inject(LobbyService).joinLobby(lobbyId, username, privateId));
	if ("player" in response) {
		localStorage.setItem(PUBLIC_ID, response.player.publicId);
		localStorage.setItem(PRIVATE_ID, response.player.privateId);
		return response.player;
	} else {
		return new RedirectCommand(router.createUrlTree(inject(GameRoute).url({ gameId: response.gameId })));
	}
}


export function resolveGame(route: TypedActivatedRouteSnapshot<HasPlayer, HasGameId>): PrivatePlayer | RedirectCommand {
	// Always set the GAME_ID. This way if we get redirected by to the
	// homepage, it will be remembered.
	localStorage.setItem(GAME_ID, route.params.gameId);
	
	const username = localStorage.getItem(USERNAME);
	const publicId = localStorage.getItem(PUBLIC_ID);
	const privateId = localStorage.getItem(PRIVATE_ID);
	if (!username || !publicId || !privateId) {
		return new RedirectCommand(inject(Router).createUrlTree(inject(HomeRoute).url()));
	}
	return {
		name: username,
		publicId: publicId,
		privateId: privateId
	};
}
