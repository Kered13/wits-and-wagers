import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { GameComponent } from 'client/src/app/game/game.component';


@Component({
	selector: 'app-root',
	imports: [RouterOutlet, GameComponent],
	templateUrl: './root.component.html',
	styleUrl: './root.component.css'
})
export class AppComponent {
	title: string = 'client';
}
