import { ChangeDetectionStrategy, Component, computed, Inject, Signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from "@angular/router";

import { GAME_ID, PRIVATE_ID, PUBLIC_ID } from "../app/localstorage.keys";
import { LobbyService } from "../lobby/lobby.service";
import { HostRoute, LOBBY_ROUTE, TypedRouteFor } from "../routes/routes";


@Component({
	selector: "app-host",
	imports: [ReactiveFormsModule, MatButton, MatCardModule, MatInputModule],
	templateUrl: "./host.component.html",
	styleUrl: "./host.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostComponent {
	readonly options = new FormGroup({
		title: new FormControl("", Validators.required),
	});
	
	private readonly username: Signal<string>;
	
	constructor(
			private readonly lobbyService: LobbyService,
			private readonly router: Router,
			@Inject(ActivatedRoute) route: TypedRouteFor<HostRoute>) {
		const data = toSignal(route.data, { requireSync: true });
		this.username = computed(() => data().username);
	}
	
	createLobby(): void {
		if (this.options.valid) {
			this.lobbyService.createLobby({ title: this.options.value.title!, host: this.username() })
				.subscribe(response => {
					localStorage.setItem(PUBLIC_ID, response.host.publicId);
					localStorage.setItem(PRIVATE_ID, response.host.privateId);
					localStorage.setItem(GAME_ID, response.id);
					this.router.navigate(LOBBY_ROUTE.url({ lobbyId: response.id }));
				});
		}
	}
}
