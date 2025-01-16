import { ChangeDetectionStrategy, Component, computed, Signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router } from "@angular/router";

import { LobbyService } from "../lobby/lobby.service";
import { toSignal } from "@angular/core/rxjs-interop";


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
	
	constructor(private readonly lobbyService: LobbyService, private readonly router: Router, route: ActivatedRoute) {
		const data = toSignal(route.data, { requireSync: true });
		this.username = computed(() => data()["username"]);
	}
	
	createLobby(): void {
		if (this.options.valid) {
			this.lobbyService.createLobby({ title: this.options.value.title!, host: this.username() })
				.subscribe(response => {
					localStorage.setItem("gameId", response.id);
					this.router.navigate(["lobby", response.id]);
				});
		}
	}
}
