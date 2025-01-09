import { Component } from "@angular/core";
import { RouterOutlet, RouterLink, RouterLinkActive } from "@angular/router";

import { GameComponent } from "../game/game.component.js";
import { HomeComponent } from "../home/home.component.js";
import { HostComponent } from "../host/host.component.js";


@Component({
	selector: "app-root",
	imports: [RouterOutlet, RouterOutlet, RouterLink, RouterLinkActive, HomeComponent, HostComponent, GameComponent],
	templateUrl: "./root.component.html",
	styleUrl: "./root.component.css"
})
export class AppComponent {
	title: string = "client";
}
