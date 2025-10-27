import { Directive, HostBinding, HostListener, input, linkedSignal, output, Signal } from "@angular/core";
import random from "random";


export type BetData = {
	value: number;
	color: string;
};

export type SpectatorBetData = {
	value: number;
	name: string;
}


function updateBetChips(previousChips: (BetData | undefined)[], newBets: BetData[]): (BetData | undefined)[] {
	const newChips = previousChips.map(chip => {
		return newBets.find(bet => bet.color === chip?.color)
	});
	// Trim trailing undefined values from the array.
	newChips.length = newChips.findLastIndex(chip => chip !== undefined) + 1;
	
	for (const bet of newBets) {
		if (!newChips.find(chip => chip && chip.color === bet.color)) {
			insertNewChip(bet, newChips);
		}
	}
	return newChips;
}


// Return all indices where the array is undefined. If less than 2 indices are
// undefined, then indices at the end of the array are added until we have 2
// indices.
function getEmptyIndices<T>(array: T[]): number[] {
	const indices = [];
	for (let i = 0; i < array.length; i++) {
		if (array[i] === undefined) {
			indices.push(i);
		}
	}
	for (let i = array.length; indices.length < 2; i++) {
		indices.push(i);
	}
	return indices;
}


// Insert the given bet into an empty position in chips. We randomly choose
// among empty positions in the middle of the array, or from the end if there
// are not enough empty positions in the middle.
function insertNewChip(bet: BetData, chips: (BetData | undefined)[]): void {
	const availableSlots = getEmptyIndices(chips);
	const slot = random.choice(availableSlots)!;
	chips[slot] = bet;
}


@Directive()
export abstract class BaseWagerBox {
	readonly color = input.required<string>();
	readonly bets = input<BetData[]>([]);
	readonly spectatorBet = input<SpectatorBetData>();
	readonly disabled = input<boolean>(false);
	
	readonly betsOnBoard: Signal<(BetData | undefined)[]>;
	
	readonly onClick = output<void>();
	
	abstract chipPositions(): string[];
	abstract spectatorChipPosition(): string;
	
	constructor() {
		this.betsOnBoard = linkedSignal<BetData[], (BetData | undefined)[]>({
			source: this.bets,
			computation: (bets, previous) => updateBetChips(previous?.value ?? [], this.bets()),
		});
	}
	
	@HostBinding("style.--bg-color")
	private get bgColor() {
		return this.color();
	}
	
	@HostBinding("class.enabled")
	private get enabledClass() {
		return !this.disabled();
	}
	
	@HostListener("click")
	private click(): void {
		if (!this.disabled()) {
			this.onClick.emit();
		}
	}
};
