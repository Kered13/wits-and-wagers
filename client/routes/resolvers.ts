import { inject } from "@angular/core";
import { RedirectCommand, Router } from "@angular/router";
import { TypedRouteSnapshot as TypedActivatedRouteSnapshot } from "ngx-typed-router";
import { firstValueFrom } from "rxjs";
import { parse } from "valibot";

import { GameRoute, HomeRoute } from "./routes.js";
import { HasGameId, HasLobbyId, HasPlayer } from "./types.js";
import { ResolveFn, StringLiterals } from "./utils.js";
import { GAME_ID, PRIVATE_ID, PUBLIC_ID, USERNAME } from "../app/localstorage.keys.js";
import { GameService } from "../game/game.service.js";
import { LobbyService } from "../lobby/lobby.service.js";
import { PrivateIdSchema, PrivatePlayer, PublicIdSchema } from "../../shared/player.js";


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
	
	// We have to get injectables before we call await below.
	const router = inject(Router);
	const lobbyService = inject(LobbyService);
	const gameService = inject(GameService);
	const homeRoute = inject(HomeRoute);
	const gameRoute = inject(GameRoute);
	
	const username = localStorage.getItem(USERNAME);
	if (!username) {
		return new RedirectCommand(router.createUrlTree(homeRoute.url()));
	}
	
	const idStr = localStorage.getItem(PRIVATE_ID);
	const privateId = idStr !== null ? parse(PrivateIdSchema, idStr) : undefined;
	const response = await firstValueFrom(lobbyService.joinLobby(lobbyId, username, privateId));
	if ("player" in response) {
		localStorage.setItem(PUBLIC_ID, response.player.publicId);
		localStorage.setItem(PRIVATE_ID, response.player.privateId);
		return response.player;
	} else {
		// TODO: Only join as spectator if we're not already part of the game.
		// TODO: Need to detect if we are trying to join as spectator or player.
		//   Only the server knows this, based on the game ID we have passed it.
		const gameResponse = await firstValueFrom(gameService.joinSpectator(response.gameId, username, privateId));
		localStorage.setItem(PUBLIC_ID, gameResponse.player.publicId);
		localStorage.setItem(PRIVATE_ID, gameResponse.player.privateId);
		return new RedirectCommand(router.createUrlTree(gameRoute.url({ gameId: response.gameId })));
	}
}


export function resolveGame(route: TypedActivatedRouteSnapshot<HasPlayer, HasGameId>): PrivatePlayer | RedirectCommand {
	// Always set the GAME_ID. This way if we get redirected by to the
	// homepage, it will be remembered.
	localStorage.setItem(GAME_ID, route.params.gameId);
	
	const router = inject(Router);
	const homeRoute = inject(HomeRoute);

	const username = localStorage.getItem(USERNAME);
	const publicId = parse(PublicIdSchema, localStorage.getItem(PUBLIC_ID));
	const privateId = parse(PrivateIdSchema, localStorage.getItem(PRIVATE_ID));
	if (!username || !publicId || !privateId) {
		return new RedirectCommand(router.createUrlTree(homeRoute.url()));
	}
	return {
		name: username,
		publicId: publicId,
		privateId: privateId,
	};
}
