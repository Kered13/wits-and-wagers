import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from "@angular/core";


@Component({
	selector: "color-button",
	imports: [],
	templateUrl: "./color-button.component.html",
	styleUrl: "./color-button.component.scss",
})
export class ColorButton {
	@Input() color: string = "#000000";
	
	@Input() disabled: boolean = false;
	
	@Output("click") readonly click = new EventEmitter<void>();
	
	showBubble: boolean = false;
	
	onClick(): void {
		this.click.emit();
	}
	
	hover(isHover: boolean): void {
		this.showBubble = isHover;
	}
}
