import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";


@Component({
	selector: "color-button",
	imports: [],
	templateUrl: "./color-button.component.html",
	styleUrl: "./color-button.component.scss",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorButton {
	readonly color = input.required<string>();
	readonly disabled = input<boolean>(false);
	
	readonly click = output<void>();
	
	showBubble: boolean = false;
	
	onClick(): void {
		this.click.emit();
	}
	
	hover(isHover: boolean): void {
		this.showBubble = isHover;
	}
}
