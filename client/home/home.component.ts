import { ChangeDetectionStrategy, Component } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from "@angular/material/input";
import { Router } from "@angular/router";

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
		this.username = localStorage.getItem("username") || "";
		this.joinCode = localStorage.getItem("gameId") || "";
	}
	
	toHostGame(): void {
		if (this.username) {
			localStorage.setItem("username", this.username);
			this.router.navigate(["host"]);
		}
	}
	
	toJoinGame(): void {
		if (this.username && this.joinCode) {
			localStorage.setItem("username", this.username);
			localStorage.setItem("gameId", this.joinCode);
			
			this.lobbyService
				.getLobbyInstanceService(this.joinCode)
				.addPlayer(this.username)
				.subscribe(player => {
					localStorage.setItem("publicId", player.publicId);
					localStorage.setItem("privateId", player.privateId);
					this.router.navigate(["lobby", this.joinCode]);
				});
		}
	}
}
