import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatIcon } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatTooltip } from "@angular/material/tooltip";

import { ScoreBoard } from "./score-board/score-board.component.js";
import { AllTooHighBox } from "./wager-box/all-too-high-box.component.js";
import { BettingBox } from "./wager-box/wager-box.component.js";
import { ColorWagerBox } from "./wager-box/color-wager-box.component.js";
import { WagerBoxBgText, WagerBoxBottomText } from "./wager-box/wager-box-content.component.js";
import { BetData } from "../common/bet-data.js";
import { GuessCard, GuessCardData } from "../common/guess-card/guess-card.component.js";
import { PlayerScoreData } from "../common/player-score-data.js";
import { GamePresenter, GameView } from "../game.presenter.js";
import { BetTarget } from "../../../shared/game/betting-phase.js";


@Component({
	selector: "desktop-game",
	imports: [
		FormsModule,
		MatCardModule,
		MatIcon,
		MatInputModule,
		MatTooltip,
		AllTooHighBox,
		BettingBox,
		ColorWagerBox,
		GuessCard,
		ScoreBoard,
		WagerBoxBgText,
		WagerBoxBottomText,
	],
	providers: [GamePresenter],
	templateUrl: "./desktop-game.component.html",
	styleUrl: "./desktop-game.component.css",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class DesktopGameComponent implements GameView, OnDestroy {
	constructor(
			private readonly presenter: GamePresenter,
			private readonly hostElement: ElementRef) {
		this.presenter.setView(this);
	}
	
	public getHostElement(): ElementRef {
		return this.hostElement;
	}
	
	isGameOverPhase(): boolean {
		return this.presenter.isGameOverPhase();
	}
	
	roundTimer(): number | undefined {
		return this.presenter.roundTimer();
	}
	
	guessCards(): (GuessCardData | undefined)[] {
		return this.presenter.guessCards();
	}
	
	onHelpClick(): void {
		this.presenter.onHelpClick();
	}
	
	public ngOnDestroy(): void {
		this.presenter.destroy();
	}
	
	// TODO: Restore UI button.
	onEndPhase(): void {
		// this.gameService().get().endPhase().subscribe();
	}
	
	onGuessCardClick(): void {
		this.presenter.onGuessCardClick();
	}
	
	onWagerBoxClick(target: BetTarget): void {
		this.presenter.onWagerBoxClick(target);
	}
	
	shouldEnableBetTarget(target: BetTarget): boolean {
		return this.presenter.shouldEnableBetTarget(target);
	}
	
	getBetsOnTarget(target: BetTarget): BetData[] {
		return this.presenter.getBetsOnTarget(target);
	}
	
	getGuessForTarget(target: BetTarget): GuessCardData | undefined {
		return this.presenter.getGuessForTarget(target);
	}
	
	getRound(): string {
		return this.presenter.getRound();
	}
	
	getPhase(): string {
		return this.presenter.getPhase();
	}
	
	getQuestion(): string {
		return this.presenter.getQuestion();
	}
	
	getSource(): string {
		return this.presenter.getSource();
	}
	
	getPlayersForScore(): PlayerScoreData[] {
		return this.presenter.getPlayersForScore();
	}
	
	getCardPosition(index: number): string {
		return [
			"translate(20px, 5px) rotate(-10deg)",
			"translate(-130px, 50px) rotate(10deg)",
			"translate(80px, -100px) rotate(20deg)",
			"translate(180px, 70px) rotate(-15deg)",
			"translate(-80px, -130px) rotate(-25deg)",
			"translate(-190px, -50px) rotate(5deg)",
			"translate(210px, -35px) rotate(5deg)",
			"translate(20px, -175px) rotate(-5deg)",
		][index];
	}
}
