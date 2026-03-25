import { TypedRoute as TypedActivatedRoute } from "ngx-typed-router";

import { HasGameId, HasLobbyId, HasPlayer, HasPresentMode, HasUsername } from "./types.js";
import { AppRoute, AppRouteNoParams } from "./utils.js";


export abstract class HomeRoute extends AppRouteNoParams {}
export abstract class HostRoute extends AppRouteNoParams<HasUsername> {}
export abstract class LobbyRoute extends AppRoute<HasPlayer, HasLobbyId> {}
export abstract class GameRoute extends AppRoute<HasPlayer, HasGameId, HasPresentMode> {}

export type TypedRouteFor<R> =
	R extends AppRoute<infer D, infer P, infer Q> ? TypedActivatedRoute<D, P, Q> : never;
