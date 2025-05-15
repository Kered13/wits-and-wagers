import { ChangeDetectionStrategy, Component, computed, Inject, Signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from '@angular/material/input';
import { MatOption, MatSelect } from "@angular/material/select";
import { ActivatedRoute } from "@angular/router";
import { parseIntSafe } from "complete-common";

import { PRIVATE_ID, PUBLIC_ID } from "../app/localstorage.keys.js";
import { LobbyService } from "../lobby/lobby.service.js";
import { HostRoute, TypedRouteFor } from "../routes/routes.js";
import { RoutingService } from "../routes/routing.service.js";
import { GetQuestionSetsResponse } from "../../shared/lobby/get-question-sets.js";


@Component({
	selector: "app-host",
	imports: [
		MatButton,
		MatCardModule,
		MatInputModule,
		MatOption,
		MatSelect,
		ReactiveFormsModule,
	],
	templateUrl: "./host.component.html",
	styleUrl: "./host.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostComponent {
	readonly options = new FormGroup({
		title: new FormControl("", Validators.required),
		questionSet: new FormControl("", Validators.required),
		numRounds: new FormControl(""),
		guessingTime: new FormControl(""),
		bettingTime: new FormControl(""),
	});
	
	private readonly username: Signal<string>;
	readonly questionSets: Signal<GetQuestionSetsResponse>;
	
	constructor(
			private readonly lobbyService: LobbyService,
			private readonly routing: RoutingService,
			@Inject(ActivatedRoute) route: TypedRouteFor<HostRoute>) {
		const data = toSignal(route.data, { requireSync: true });
		this.username = computed(() => data().username);
		this.questionSets = toSignal(this.lobbyService.getQuestionSets(), { initialValue: [] });
	}
	
	createLobby(): void {
		if (this.options.valid) {
			this.lobbyService.createLobby({
					title: this.options.value.title!,
					host: this.username(),
					options: {
						questionSet: this.options.value.questionSet!,
						numRounds: parseIntSafe(this.options.value.numRounds ?? ""),
						guessingPhaseDuration: parseIntSafe(this.options.value.guessingTime ?? ""),
						bettingPhaseDuration: parseIntSafe(this.options.value.bettingTime ?? ""),
					}
				}).subscribe(response => {
					localStorage.setItem(PUBLIC_ID, response.host.publicId);
					localStorage.setItem(PRIVATE_ID, response.host.privateId);
					this.routing.toLobby(response.id);
				});
		}
	}
}
