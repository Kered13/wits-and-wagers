import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';


@Component({
	selector: 'app-host',
	imports: [MatButton, MatCardModule],
	templateUrl: './host.component.html',
	styleUrl: './host.component.css',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class HostComponent {
	createGame(): void {
	}
}
