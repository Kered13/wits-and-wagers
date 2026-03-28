import { Injectable } from "@angular/core";
import { Router } from "@angular/router";

import { GameRoute, HomeRoute, HostRoute, LobbyRoute } from "./routes";
import { LobbyId } from "../../shared/lobby/lobby";
import { GameId } from "../../shared/game/game";


@Injectable({ providedIn: "root" })
export class RoutingService {
	constructor(
		private readonly router: Router,
		private readonly homeRoute: HomeRoute,
		private readonly hostRoute: HostRoute,
		private readonly lobbyRoute: LobbyRoute,
		private readonly gameRoute: GameRoute) {}
	
	public toHome(): void {
		this.router.navigate(this.homeRoute.url(), { queryParamsHandling: "preserve" });
	}
	
	public toHost(): void {
		this.router.navigate(this.hostRoute.url(), { queryParamsHandling: "preserve" });
	}
	
	public toLobby(id: LobbyId): void {
		this.router.navigate(this.lobbyRoute.url({ lobbyId: id }), { queryParamsHandling: "preserve" });
	}
	
	public toGame(id: GameId): void {
		this.router.navigate(this.gameRoute.url({ gameId: id }), { queryParamsHandling: "preserve" });
	}
}
