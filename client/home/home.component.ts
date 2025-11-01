import { ChangeDetectionStrategy, Component } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { FormsModule } from "@angular/forms";
import { MatInputModule } from "@angular/material/input";
import { parse } from "valibot";

import { GAME_ID, USERNAME } from "../app/localstorage.keys.js";
import { RoutingService } from "../routes/routing.service.js";
import { LobbyIdSchema } from "../../shared/lobby/lobby.js";


@Component({
	selector: "app-home",
	imports: [FormsModule, MatButton, MatCardModule, MatInputModule],
	templateUrl: "./home.component.html",
	styleUrl: "./home.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
	username: string;
	joinCode: string;
	
	constructor(private readonly routing: RoutingService) {
		this.username = localStorage.getItem(USERNAME) || "";
		this.joinCode = localStorage.getItem(GAME_ID) || "";
	}
	
	onHostGame(): void {
		if (this.username) {
			localStorage.setItem(USERNAME, this.username);
			this.routing.toHost();
		}
	}
	
	onJoinGame(): void {
		if (this.username && this.joinCode) {
			localStorage.setItem(USERNAME, this.username);
			this.routing.toLobby(parse(LobbyIdSchema, this.joinCode));
		}
	}
}
