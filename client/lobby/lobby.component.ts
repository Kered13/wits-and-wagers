import { ChangeDetectionStrategy, Component, effect, Signal } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from '@angular/material/input';
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";

import { LobbyInstanceService, LobbyService } from "./lobby.service.js";
import { LobbyId, LobbyJson } from "../../shared/lobby/lobby.js";
import { PrivatePlayer } from "../../shared/player.js";
import { firstValueFrom, map, switchMap } from "rxjs";
import { GAME_ID } from "../app/localstorage.keys.js";


@Component({
	selector: "app-lobby",
	imports: [ReactiveFormsModule, MatButton, MatCardModule, MatInputModule],
	templateUrl: "./lobby.component.html",
	styleUrl: "./lobby.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class LobbyComponent {
	private readonly player: Signal<PrivatePlayer>;
	private readonly lobbyService: Signal<LobbyInstanceService>;
	
	readonly lobbyId: Signal<LobbyId>;
	readonly lobby: Signal<LobbyJson>;
	
	constructor(
			private readonly router: Router,
			lobbyService: LobbyService,
			titleService: Title,
			route: ActivatedRoute) {
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
			.subscribe(gameId => this.router.navigate(["game", gameId]));
		
		instanceService.pipe(switchMap(service => service.onCanceled()))
			.subscribe(gameId => {
				localStorage.removeItem(GAME_ID);
				this.router.navigate([""]);
			});
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.lobby().title));
	}
	
	beginGame(): void {
		this.lobbyService().beginGame().subscribe();
	}
	
	cancelLobby(): void {
		this.lobbyService().cancelLobby().subscribe();
	}
}
