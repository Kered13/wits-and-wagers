import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet, RouterLink, RouterLinkActive } from "@angular/router";


@Component({
	selector: "app-root",
	imports: [RouterOutlet, RouterOutlet, RouterLink, RouterLinkActive],
	templateUrl: "./root.component.html",
	styleUrl: "./root.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
	title: string = "client";
}
