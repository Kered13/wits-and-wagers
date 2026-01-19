export abstract class Closeable {
	private closed = false;
	
	protected abstract doClose(): void;
	
	close(): void {
		if (!this.closed) {
			this.closed = true;
			this.doClose();
		}
	}
	
	isClosed(): boolean {
		return this.closed;
	}
}


export class RefCounted<T extends Closeable> {
	private count: number = 0;
	
	public constructor(private readonly t: T) {}
	
	public get(): T {
		return this.t;
	}
	
	public release(): void {
		if (this.t.isClosed()) {
			return;
		}
		
		if(--this.count === 0) {
			this.t.close();
		}
	}
	
	public acquire(): void {
		if (this.t.isClosed()) {
			return;
		}
		
		this.count++;
	}
}
