import random from "random";


type Item = {
	color?: string;
};


// A list that partially randomizes the order of entries, allowing for gaps. The
// list can be updated with a new list of items. Old items will be removed and
// new items added, while existing items retain their positions in the list.
export class RandomizedList<T extends Item> {
	private list: (T | undefined)[];
	private readonly numInsertSlots: number;
	private readonly maxListSize: number;
	
	constructor(list: (T | undefined)[], numInsertSlots: number, maxListSize: number) {
		this.list = list;
		this.numInsertSlots = numInsertSlots;
		this.maxListSize = maxListSize;
	}
	
	public entries(): (T | undefined)[] {
		return this.list;
	}
	
	// Returns a new list containing the given items. Items carried over from
	// the existing list maintain their place in the list, and new items are
	// randomly assigned to positions.
	public update(newItems: T[]): RandomizedList<T> {
		// Remove all items that are no longer in the list. Remaining items keep
		// their positions.
		const newList = this.list.map(t => {
			return newItems.find(item => t !== undefined && item.color === t.color);
		});
		// Trim trailing undefined values from the array.
		newList.length = newList.findLastIndex(t => t !== undefined) + 1;
		
		for (const item of newItems) {
			if (!newList.find(t => t && t.color === item.color)) {
				this.insertNewItem(item, newList);
			}
		}
		return new RandomizedList(newList, this.numInsertSlots, this.maxListSize);
	}
	
	// Insert the given item into an empty position in the list. We randomly
	// choose among empty positions in the middle of the array, or from the end
	// if there are not enough empty positions in the middle.
	private insertNewItem(item: T, list: (T | undefined)[]): void {
		const availableSlots = this.getEmptyIndices(list);
		const slot = random.choice(availableSlots)!;
		list[slot] = item;
	}
	
	// Return all indices where the array is undefined. If less than
	// `numInsertSlots` indices are undefined, then indices at the end of the
	// array are added until we have `numInsertSlots` indices, but we never
	// return an index more than `maxListSize`.
	private getEmptyIndices(list: (T | undefined)[]): number[] {
		const indices = [];
		for (let i = 0; i < list.length; i++) {
			if (list[i] === undefined) {
				indices.push(i);
			}
		}
		for (let i = list.length; i < this.maxListSize && indices.length < this.numInsertSlots; i++) {
			indices.push(i);
		}
		return indices;
	}
}
