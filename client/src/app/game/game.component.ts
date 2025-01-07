import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
	selector: 'app-game',
	imports: [MatButton, MatCardModule],
	templateUrl: './game.component.html',
	styleUrl: './game.component.css'
})
export class GameComponent {
	counter: number = 0;
	
	onAddOne(): void {
		this.counter++;
	}
	
	onReset(): void {
		this.counter = 0;
	}
}
