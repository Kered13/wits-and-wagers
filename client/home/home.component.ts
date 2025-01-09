import { Component } from "@angular/core";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { Router } from "@angular/router";


@Component({
	selector: "app-home",
	imports: [MatButton, MatCardModule],
	templateUrl: "./home.component.html",
	styleUrl: "./home.component.css"
})
export class HomeComponent {
	constructor(private router: Router) {}
	
	toHostGame(): void {
		this.router.navigate(["host"]);
	}
	
	toJoinGame(): void {
		this.router.navigate(["game"]);
	}
}
