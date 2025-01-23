import { ChangeDetectionStrategy, Component, effect, Inject, Signal } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from '@angular/material/input';
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { map, switchMap } from "rxjs";

import { LobbyInstanceService, LobbyService } from "./lobby.service.js";
import { GAME_ID } from "../app/localstorage.keys.js";
import { GAME_ROUTE, HOME_ROUTE, LobbyRoute, TypedRouteFor } from "../routes/routes.js";
import { LobbyId, LobbyJson } from "../../shared/lobby/lobby.js";
import { PrivatePlayer } from "../../shared/player.js";


@Component({
	selector: "app-lobby",
	imports: [ReactiveFormsModule, MatButton, MatCardModule, MatInputModule],
	templateUrl: "./lobby.component.html",
	styleUrl: "./lobby.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class LobbyComponent {
	private readonly lobbyService: Signal<LobbyInstanceService>;
	
	readonly lobbyId: Signal<LobbyId>;
	readonly lobby: Signal<LobbyJson>;
	readonly player: Signal<PrivatePlayer>;
	
	constructor(
			private readonly router: Router,
			lobbyService: LobbyService,
			titleService: Title,
			@Inject(ActivatedRoute) route: TypedRouteFor<LobbyRoute>) {
		this.player = toSignal(
			route.data.pipe(map(data => ({
				name: data.username,
				publicId: data.publicId,
				privateId: data.privateId
			}))),
			{ requireSync: true });
		
		this.lobbyId = toSignal(
			route.paramMap.pipe(map(params => params.get("lobbyId")!)),
			{ requireSync: true });
		
		// Don't use this.lobbyId here because it may not have updated yet.
		const instanceService = route.paramMap.pipe(
			map(params => lobbyService.getLobbyInstanceService(params.get("lobbyId")!)));
		
		this.lobbyService = toSignal(instanceService, { requireSync: true });
		this.lobby = toSignal(
			instanceService.pipe(switchMap(service => service.onLobbyUpdate())),
			{ initialValue: { title: "", host: "", players: [] }});
		
		instanceService.pipe(switchMap(service => service.onBeginGame()))
			.subscribe(gameId => this.router.navigate(GAME_ROUTE.url({ gameId: gameId })));
		
		instanceService.pipe(switchMap(service => service.onCanceled()))
			.subscribe(() => {
				localStorage.removeItem(GAME_ID);
				this.router.navigate(HOME_ROUTE.url());
			});
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.lobby().title));
	}
	
	beginGame(): void {
		this.lobbyService().beginGame(this.player()).subscribe();
	}
	
	cancelLobby(): void {
		this.lobbyService().cancelLobby(this.player()).subscribe();
	}
}
