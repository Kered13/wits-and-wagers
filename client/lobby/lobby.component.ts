import { ChangeDetectionStrategy, Component, computed, effect, Signal } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from '@angular/material/input';
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";

import { LobbyInstanceService, LobbyService } from "./lobby.service.js";
import { LobbyId, LobbyJson } from "../../shared/lobby/lobby.js";
import { GameService } from "../game/game.service.js";
import { PrivatePlayer } from "../../shared/player.js";
import { firstValueFrom, map, Observable, switchMap } from "rxjs";


@Component({
	selector: "app-lobby",
	imports: [ReactiveFormsModule, MatButton, MatCardModule, MatInputModule],
	templateUrl: "./lobby.component.html",
	styleUrl: "./lobby.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class LobbyComponent {
	private readonly player: Signal<PrivatePlayer>;
	
	readonly lobbyId: Signal<LobbyId>;
	readonly lobby: Signal<LobbyJson>;
	
	constructor(
			private readonly gameService: GameService,
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
		this.lobby = toSignal(
			instanceService.pipe(switchMap(service => service.onLobbyUpdate())),
			{ initialValue: { title: "", host: "", players: [] }});
		
		const title = toSignal(route.title);
		effect(() => titleService.setTitle(title() + " - " + this.lobby().title));
		
		firstValueFrom(instanceService.pipe(switchMap(service => service.onBeginGame())))
			.then(gameId => this.router.navigate(["game", gameId]));
	}
	
	beginGame(): void {
		this.gameService.createGame(this.lobbyId()).subscribe();
	}
}
