import { ChangeDetectionStrategy, Component } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from "@angular/material/input";
import { Router } from "@angular/router";

import { GAME_ID, PRIVATE_ID, PUBLIC_ID, USERNAME } from "../app/localstorage.keys";
import { LobbyService } from "../lobby/lobby.service";


@Component({
	selector: "app-home",
	imports: [ReactiveFormsModule, FormsModule, MatButton, MatCardModule, MatInputModule],
	templateUrl: "./home.component.html",
	styleUrl: "./home.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
	username: string;
	joinCode: string;
	
	constructor(private readonly lobbyService: LobbyService, private router: Router) {
		this.username = localStorage.getItem(USERNAME) || "";
		this.joinCode = localStorage.getItem(GAME_ID) || "";
	}
	
	toHostGame(): void {
		if (this.username) {
			localStorage.setItem(USERNAME, this.username);
			this.router.navigate(["host"]);
		}
	}
	
	toJoinGame(): void {
		if (this.username && this.joinCode) {
			localStorage.setItem(USERNAME, this.username);
			localStorage.setItem(GAME_ID, this.joinCode);
			
			this.lobbyService
				.getLobbyInstanceService(this.joinCode)
				.addPlayer(this.username)
				.subscribe(player => {
					localStorage.setItem(PUBLIC_ID, player.publicId);
					localStorage.setItem(PRIVATE_ID, player.privateId);
					this.router.navigate(["lobby", this.joinCode]);
				});
		}
	}
}
