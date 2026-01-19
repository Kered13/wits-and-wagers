import { ChangeDetectionStrategy, Component, computed, Inject, Signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { AbstractControl, FormControl, FormGroup, FormGroupDirective, NgForm, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatError, MatInputModule } from "@angular/material/input";
import { MatOption, MatSelect } from "@angular/material/select";
import { ErrorStateMatcher } from "@angular/material/core"
import { ActivatedRoute } from "@angular/router";
import { parseIntSafe } from "complete-common";

import { PRIVATE_ID, PUBLIC_ID } from "../app/localstorage.keys.js";
import { LobbyService } from "../lobby/lobby.service.js";
import { HostRoute, TypedRouteFor } from "../routes/routes.js";
import { RoutingService } from "../routes/routing.service.js";
import { GetQuestionSetsResponse } from "../../shared/questions/get-question-sets.js";
import { QuestionSetId } from "../../shared/questions/questions.js";


@Component({
	selector: "app-host",
	imports: [
		MatButton,
		MatCardModule,
		MatCheckboxModule,
		MatError,
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
		questionSets: new FormControl<QuestionSetId[] | undefined>(undefined, Validators.required),
		numberOfPlayers: new FormControl<number>(7, Validators.required),
		numberOfRounds: new FormControl("7", Validators.required),
		endQuestionPhaseWhenAllGuessesSubmitted: new FormControl(true),
		questionTime: new FormControl(""),
		bettingTime: new FormControl(""),
	}, this.numberOfRoundsValidator());
	
	private readonly username: Signal<string>;
	
	readonly questionSets: Signal<GetQuestionSetsResponse>;
	
	readonly numRoundsMatcher: ErrorStateMatcher;
	
	constructor(
			private readonly lobbyService: LobbyService,
			private readonly routing: RoutingService,
			@Inject(ActivatedRoute) route: TypedRouteFor<HostRoute>) {
		const data = toSignal(route.data, { requireSync: true });
		this.username = computed(() => data().username);
		this.questionSets = toSignal(this.lobbyService.getQuestionSets(), { initialValue: [] });
		
		const that = this;
		this.numRoundsMatcher = {
			isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
				return new ErrorStateMatcher().isErrorState(control, form) ||
					that.options.hasError("NotEnoughQuestionsInSet");
			}
		};
	}
	
	private numberOfRoundsValidator(): ValidatorFn {
		return (abstractControl: AbstractControl): ValidationErrors | null => {
			// Enable type checking.
			const control = abstractControl as typeof this.options;
			
			if (!control.dirty) {
				return null;
			}
			
			const numberOfRounds = parseIntSafe(control.value.numberOfRounds ?? "");
			const questionSets = control.value.questionSets ?? [];
			
			// Don't fail if fields have not been filled yet. Other validators
			// will catch required fields.
			if (numberOfRounds === undefined) {
				return null;
			} else if (questionSets.length === 0) {
				return null;
			} else if (numberOfRounds <= 0) {
				return { "RoundsMustBePositive": true };
			}
			const numQuestions = this.questionSets()
				.filter(qs => questionSets.includes(qs.id))
				.reduce((size, qs) => size + qs.size, 0);
			if (numberOfRounds > numQuestions) {
				return { "NotEnoughQuestionsInSet": true };
			}
			return null;
		}
	}
	
	createLobby(): void {
		if (this.options.valid) {
			let questionTime = this.options.value.questionTime ? parseInt(this.options.value.questionTime) * 1000 : undefined;
			let bettingTime = this.options.value.bettingTime ? parseInt(this.options.value.bettingTime) * 1000 : undefined;
			
			this.lobbyService.createLobby({
					options: {
						title: this.options.value.title!,
						host: this.username(),
						questionSets: this.options.value.questionSets!,
						maxPlayers: this.options.value.numberOfPlayers ?? 7,
						numberOfRounds: parseIntSafe(this.options.value.numberOfRounds ?? ""),
						endQuestionPhaseWhenAllGuessesSubmitted: this.options.value.endQuestionPhaseWhenAllGuessesSubmitted!,
						questionPhaseDuration: questionTime,
						bettingPhaseDuration: bettingTime,
					}
				}).subscribe(response => {
					localStorage.setItem(PUBLIC_ID, response.host.publicId);
					localStorage.setItem(PRIVATE_ID, response.host.privateId);
					this.routing.toLobby(response.id);
				});
		}
	}
}
