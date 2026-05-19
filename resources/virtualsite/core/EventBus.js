/**
 * Lightweight typed event emitter.
 */
export class EventBus {
    /**
     * Create an event bus instance.
     */
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this.handlers = new Map();
    }

    /**
     * Subscribe to an event.
     * @param {string} eventName - Event key.
     * @param {(...args: any[]) => void} callback - Event callback.
     * @returns {() => void} Unsubscribe function.
     */
    on(eventName, callback) {
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, new Set());
        }

        this.handlers.get(eventName).add(callback);

        return () => {
            this.handlers.get(eventName)?.delete(callback);
        };
    }

    /**
     * Emit event payload to subscribers.
     * @param {string} eventName - Event key.
     * @param {...any} args - Event payload arguments.
     * @returns {void}
     */
    emit(eventName, ...args) {
        const callbacks = this.handlers.get(eventName);
        if (!callbacks) {
            return;
        }

        callbacks.forEach((callback) => {
            callback(...args);
        });
    }
}
