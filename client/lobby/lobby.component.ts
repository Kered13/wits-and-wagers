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


@Component({
	selector: "app-lobby",
	imports: [ReactiveFormsModule, MatButton, MatCardModule, MatInputModule],
	templateUrl: "./lobby.component.html",
	styleUrl: "./lobby.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class LobbyComponent {
	private readonly lobbyService: Signal<LobbyInstanceService>;
	private readonly player: Signal<PrivatePlayer>;
	
	readonly lobbyId: Signal<LobbyId>;
	readonly lobby: Signal<LobbyJson>;
	
	constructor(
			private readonly gameService: GameService,
			private readonly router: Router,
			lobbyService: LobbyService,
			titleService: Title,
			route: ActivatedRoute) {
		const data = toSignal(route.data, { requireSync: true });
		this.player = computed(() => ({
			name: data().username,
			publicId: data().publicId,
			privateId: data().privateId
		}));
		
		const params: Signal<ParamMap> = toSignal(route.paramMap, { requireSync: true });
		this.lobbyId = computed(() => params().get("lobbyId")!);
		this.lobbyService = computed(() => lobbyService.getLobbyInstanceService(this.lobbyId()));
		this.lobby = computed(() => this.lobbyService().lobbyState());
		
		const title = toSignal(route.title);
		effect(() => titleService.setTitle(title() + " - " + this.lobby().title));
	}
	
	beginGame(): void {
		this.gameService.createGame(this.lobbyId())
			.subscribe(response => this.router.navigate(["game", response.id]));
	}
}
