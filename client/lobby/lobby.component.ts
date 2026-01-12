import { OverlayModule } from "@angular/cdk/overlay";
import { ChangeDetectionStrategy, Component, computed, effect, Inject, linkedSignal, OnDestroy, Signal } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButton, MatMiniFabButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule } from "@angular/material/menu";
import { MatTooltip } from "@angular/material/tooltip";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { map, pairwise, Subscription, startWith, switchMap, combineLatest } from "rxjs";


import { ColorButton } from "./color-button.component.js";
import { LobbyInstanceService, LobbyService } from "./lobby.service.js";
import { GAME_ID, PRIVATE_ID, PUBLIC_ID } from "../app/localstorage.keys.js";
import { GlobalErrorHandler } from "../error-dialog/error-handler.js";
import { RoutingService } from "../routes/routing.service.js";
import { RefCounted } from "../utils/refcounted.js";
import { LobbyRoute, TypedRouteFor } from "../routes/routes.js";
import { Color, COLORS } from "../../shared/color.js";
import { LobbyPlayer, LobbyState } from "../../shared/lobby/lobby.js";
import { PrivatePlayer, PublicId } from "../../shared/player.js";


@Component({
	selector: "app-lobby",
	imports: [
		ColorButton,
		ReactiveFormsModule,
		MatButton,
		MatCardModule,
		MatIconModule,
		MatInputModule,
		MatMenuModule,
		MatMiniFabButton,
		MatTooltip,
		OverlayModule],
	templateUrl: "./lobby.component.html",
	styleUrl: "./lobby.component.scss",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class LobbyComponent implements OnDestroy {
	private readonly lobbyService: Signal<RefCounted<LobbyInstanceService>>;
	private readonly subs: Subscription[] = [];
	private readonly instanceSub: Subscription;
	
	readonly COLORS = COLORS;
	
	readonly lobbyState: Signal<LobbyState>;
	readonly thisParticipant: Signal<PrivatePlayer>;
	readonly colorPickerState: Signal<Record<PublicId, boolean>>;
	
	isOpen: boolean = false;
	
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
		this.lobbyState = toSignal(
			instanceService.pipe(switchMap(service => service.get().onLobbyUpdate())),
			{ initialValue: { title: "", host: "" as PublicId, maxPlayers: 7, players: [], spectators: [] } });
		
		this.colorPickerState = linkedSignal({
			source: this.lobbyState,
			computation: (newState, previous) =>
				Object.fromEntries(
					newState.players.map(
						p => [p.publicId, previous?.value[p.publicId] ?? false]))
		});
		
		effect(() => titleService.setTitle(route.routeConfig!.title! + " - " + this.lobbyState().title));
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
				localStorage.removeItem(PUBLIC_ID);
				localStorage.removeItem(PRIVATE_ID);
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
	
	isHost(player: PublicId): boolean {
		return player === this.lobbyState().host;
	}
	
	isThisPlayerHost(): boolean {
		return this.isHost(this.thisParticipant().publicId);
	}
	
	moveToPlayers(player: PublicId): void {
		if (this.isThisPlayerHost()) {
			this.lobbyService().get().movePlayer(player, "player").subscribe();
		}
	}
	
	moveToSpectators(player: PublicId): void {
		if (this.isThisPlayerHost()) {
			this.lobbyService().get().movePlayer(player, "spectator").subscribe();
		}
	}
	
	kickPlayer(player: PublicId): void {
		if (this.isThisPlayerHost()) {
			this.lobbyService().get().kickPlayer(player).subscribe();
		}
	}
	
	setColor(player: PublicId, color: Color): void {
		if (this.isThisPlayerHost() || player === this.thisParticipant().publicId) {
			this.lobbyService().get().setColor(player, color).subscribe();
		}
	}
	
	onBeginGame(): void {
		this.lobbyService().get().beginGame().subscribe();
	}
	
	onCancelLobby(): void {
		this.lobbyService().get().cancelLobby().subscribe();
	}
	
	isColorAvailable(players: LobbyPlayer[], color: Color): boolean {
		return !players.some(p => p.color === color);
	}
	
	isColorPickerOpen(player: LobbyPlayer): boolean {
		return this.colorPickerState()[player.publicId];
	}
	
	toggleColorPicker(player: LobbyPlayer): void {
		const colorPickers = this.colorPickerState();
		colorPickers[player.publicId] = !colorPickers[player.publicId];
	}
	
	closeColorPicker(player: LobbyPlayer): void {
		this.colorPickerState()[player.publicId] = false;
	}
	
	isLobbyFull(): boolean {
		return this.lobbyState().players.length >= this.lobbyState().maxPlayers;
	}
}
