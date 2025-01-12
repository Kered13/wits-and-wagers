import { ChangeDetectionStrategy, Component } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from '@angular/material/input';
import { Router } from "@angular/router";

import { GameService } from "../game/game.service";


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
	
	constructor(private readonly gameService: GameService, private readonly router: Router) {}
	
	createGame(): void {
		this.gameService.createGame({ title: this.options.value.title! })
			.subscribe(response => this.router.navigate(["game", response.id]));
	}
}
