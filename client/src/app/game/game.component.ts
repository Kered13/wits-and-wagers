import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Subscription } from 'rxjs';

import { GameService } from './game.service';
import { GameJson } from 'shared/game/game.interface';


@Component({
	selector: 'app-game',
	imports: [MatButton, MatCardModule],
	templateUrl: './game.component.html',
	styleUrl: './game.component.css'
})
export class GameComponent implements OnInit, OnDestroy{
	counter: number = 0;
	private counterSub: Subscription | undefined;
	
	constructor(private gameService: GameService) {}
	
	ngOnInit(): void {
		this.counter = this.gameService.getGameState().counter;
		this.counterSub = this.gameService.getGameUpdateListener()
			.subscribe((game: GameJson) => {
				this.counter = game.counter;
			});
	}
	
	ngOnDestroy(): void {
		this.counterSub?.unsubscribe();
	}
	
	onAddOne(): void {
		this.gameService.addOne();
	}
	
	onReset(): void {
		this.gameService.resetCounter();
	}
}
