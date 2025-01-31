import { ChangeDetectionStrategy, Component, effect, Inject, OnDestroy, Signal } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from '@angular/material/input';
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { map, pairwise, Subscription, startWith, switchMap } from "rxjs";

import { LobbyInstanceService, LobbyService } from "./lobby.service.js";
import { GAME_ID } from "../app/localstorage.keys.js";
import { RefCounted } from "../utils/refcounted.js";
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
export class LobbyComponent implements OnDestroy {
	private readonly lobbyService: Signal<RefCounted<LobbyInstanceService>>;
	private readonly subs: Subscription[] = [];
	private readonly instanceSub: Subscription;
	
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
		
		// Don't use lobbyId signal here because it may not have updated yet.
		const instanceService = route.paramMap.pipe(
			map(params => lobbyService.getLobbyInstanceService(params.get("lobbyId")!)));
		this.instanceSub = instanceService.pipe(startWith(undefined), pairwise())
			.subscribe(([oldService, newService]) => this.onNewLobby(newService!, oldService));
		
		this.lobbyService = toSignal(instanceService, { requireSync: true });
		this.lobby = toSignal(
			instanceService.pipe(switchMap(service => service.get().onLobbyUpdate())),
			{ initialValue: { title: "", host: "", players: [] } });
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.lobby().title));
	}
	
	private onNewLobby(newService: RefCounted<LobbyInstanceService>, oldService?: RefCounted<LobbyInstanceService>): void {
		if (oldService) {
			this.closeLobbyService(oldService);
		}
		
		newService.acquire();
		this.subs.push(
			newService.get().onBeginGame().subscribe(gameId => this.router.navigate(GAME_ROUTE.url({ gameId: gameId }))),
			newService.get().onCanceled().subscribe(() => {
				localStorage.removeItem(GAME_ID);
				this.router.navigate(HOME_ROUTE.url());
			}),
			newService.get().onError().subscribe(err => {
				console.error(`WebSocket returned status ${err.status}: ${err.message}`);
				this.router.navigate(HOME_ROUTE.url());
			}));
	}
	
	private closeLobbyService(service: RefCounted<LobbyInstanceService>): void {
		service.release();
		this.subs.forEach(sub => sub.unsubscribe());
		this.subs.length = 0;
	}
	
	public ngOnDestroy(): void {
		this.closeLobbyService(this.lobbyService());
		this.instanceSub.unsubscribe();
	}
	
	beginGame(): void {
		this.lobbyService().get().beginGame(this.player()).subscribe();
	}
	
	cancelLobby(): void {
		this.lobbyService().get().cancelLobby(this.player()).subscribe();
	}
}
