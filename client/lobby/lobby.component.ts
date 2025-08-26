import { ChangeDetectionStrategy, Component, computed, effect, Inject, OnDestroy, Signal } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButton, MatMiniFabButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from '@angular/material/input';
import { MatTooltip } from "@angular/material/tooltip";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { map, pairwise, Subscription, startWith, switchMap, combineLatest, catchError, EMPTY } from "rxjs";


import { LobbyInstanceService, LobbyService } from "./lobby.service.js";
import { GAME_ID, PRIVATE_ID, PUBLIC_ID } from "../app/localstorage.keys.js";
import { GlobalErrorHandler } from "../error-dialog/error-handler.js";
import { RefCounted } from "../utils/refcounted.js";
import { LobbyRoute, TypedRouteFor } from "../routes/routes.js";
import { LobbyState } from "../../shared/lobby/lobby.js";
import { PrivatePlayer, PublicId } from "../../shared/player.js";
import { RoutingService } from "../routes/routing.service.js";


@Component({
	selector: "app-lobby",
	imports: [ReactiveFormsModule, MatButton, MatCardModule, MatIconModule, MatInputModule, MatMiniFabButton, MatTooltip],
	templateUrl: "./lobby.component.html",
	styleUrl: "./lobby.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class LobbyComponent implements OnDestroy {
	private readonly lobbyService: Signal<RefCounted<LobbyInstanceService>>;
	private readonly subs: Subscription[] = [];
	private readonly instanceSub: Subscription;
	
	readonly lobby: Signal<LobbyState>;
	readonly thisParticipant: Signal<PrivatePlayer>;
	readonly isHost: Signal<boolean>;
	
	constructor(
			private readonly errorHandler: GlobalErrorHandler,
			private readonly routing: RoutingService,
			lobbyService: LobbyService,
			titleService: Title,
			@Inject(ActivatedRoute) route: TypedRouteFor<LobbyRoute>) {
		this.thisParticipant = toSignal(
			route.data.pipe(map(data => data.player)), { requireSync: true });
		
		const instanceService = combineLatest([route.params, route.data]).pipe(
			map(([params, data]) => lobbyService.getLobbyInstanceService(params.lobbyId, data.player.privateId)));
		this.instanceSub = instanceService.pipe(startWith(undefined), pairwise())
			.subscribe(([oldService, newService]) => this.onNewLobby(newService!, oldService));
		
		this.lobbyService = toSignal(instanceService, { requireSync: true });
		this.lobby = toSignal(
			instanceService.pipe(switchMap(service => service.get().onLobbyUpdate())),
			{ initialValue: { title: "", host: "", players: [], spectators: [] } });
		
		this.isHost = computed(() => this.thisParticipant().publicId === this.lobby().host);
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.lobby().title));
	}
	
	private onNewLobby(newService: RefCounted<LobbyInstanceService>, oldService?: RefCounted<LobbyInstanceService>): void {
		if (oldService) {
			this.closeLobbyService(oldService);
		}
		
		newService.acquire();
		
		// Set up the handlers for the events that will take us to the next page.
		this.subs.push(
			newService.get().onBeginGame().subscribe(gameId => {
				this.routing.toGame(gameId);
			}),
			newService.get().onCanceled().subscribe(() => {
				localStorage.removeItem(GAME_ID);
				this.routing.toHome();
			}),
			newService.get().onKicked().subscribe(() => {
				// TODO: Improve this UI?
				alert("You have been removed from the lobby.");
				localStorage.removeItem(GAME_ID);
				localStorage.removeItem(PUBLIC_ID);
				localStorage.removeItem(PRIVATE_ID);
				this.routing.toHome();
			}),
			newService.get().onError().subscribe(err => {
				this.errorHandler.handleError(err)
					.subscribe(_ => this.routing.toHome());
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
	
	moveToPlayers(player: PublicId): void {
		console.log("Move to players: " + player);
	}
	
	moveToSpectators(player: PublicId): void {
		console.log("Move to spectators: " + player);
	}
	
	kickPlayer(player: PublicId): void {
		if (this.isHost()) {
			this.lobbyService().get().kickPlayer(player, this.thisParticipant().privateId).subscribe();
		}
	}
	
	onBeginGame(): void {
		this.lobbyService().get().beginGame().subscribe();
	}
	
	onCancelLobby(): void {
		this.lobbyService().get().cancelLobby().subscribe();
	}
}
