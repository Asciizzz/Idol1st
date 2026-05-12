export class EditorBus {
    constructor() {
        this.handlers = new Map();
    }

    on(eventName, callback) {
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, new Set());
        }

        this.handlers.get(eventName).add(callback);

        return () => {
            this.handlers.get(eventName)?.delete(callback);
        };
    }

    emit(eventName, payload) {
        const callbacks = this.handlers.get(eventName);
        if (!callbacks) {
            return;
        }

        callbacks.forEach(function(callback) {
            callback(payload);
        });
    }
}
