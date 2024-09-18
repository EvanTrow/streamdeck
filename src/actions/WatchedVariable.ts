type Listener<T> = (newValue: T, oldValue: T) => void;

class EventEmitter<T> {
	private listeners: Listener<T>[] = [];

	// Method to add a listener
	public on(listener: Listener<T>): void {
		this.listeners.push(listener);
	}

	// Method to remove a listener
	public off(listener: Listener<T>): void {
		this.listeners = this.listeners.filter((l) => l !== listener);
	}

	// Method to emit an event
	public emit(newValue: T, oldValue: T): void {
		for (const listener of this.listeners) {
			listener(newValue, oldValue);
		}
	}
}

export class WatchedVariable<T> {
	private _value: T;
	private eventEmitter: EventEmitter<T>;

	constructor(initialValue: T) {
		this._value = initialValue;
		this.eventEmitter = new EventEmitter<T>();
	}

	// Getter for the variable's value
	get value(): T {
		return this._value;
	}

	// Setter for the variable's value
	set value(newValue: T) {
		if (newValue !== this._value) {
			const oldValue = this._value;
			this._value = newValue;
			this.eventEmitter.emit(newValue, oldValue);
		}
	}

	// Method to watch for changes
	public watch(listener: Listener<T>): void {
		this.eventEmitter.on(listener);
	}

	// Method to stop watching for changes
	public unwatch(listener: Listener<T>): void {
		this.eventEmitter.off(listener);
	}
}
