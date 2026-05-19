import { EventBus } from '../core/EventBus.js';
import { deepClone } from '../core/DeepClone.js';

const EVENT_CHANGE = 'change';

/**
 * Project state store with subscribe/update APIs.
 */
export class ProjectStore {
    /**
     * Create a project store.
     * @param {object} initialState - Initial state snapshot.
     */
    constructor(initialState) {
        /** @type {object} */
        this.state = deepClone(initialState || {});
        /** @type {EventBus} */
        this.bus = new EventBus();
    }

    /**
     * Read the current state snapshot.
     * @returns {object} Cloned state snapshot.
     */
    getState() {
        return deepClone(this.state);
    }

    /**
     * Subscribe to state changes.
     * @param {(nextState: object, previousState: object) => void} listener - Change listener.
     * @returns {() => void} Unsubscribe function.
     */
    subscribe(listener) {
        return this.bus.on(EVENT_CHANGE, listener);
    }

    /**
     * Replace state with a full next snapshot.
     * @param {object} nextState - Full next state.
     * @returns {void}
     */
    setState(nextState) {
        const previous = this.getState();
        this.state = deepClone(nextState || {});
        this.bus.emit(EVENT_CHANGE, this.getState(), previous);
    }

    /**
     * Apply mutation logic on a writable draft clone.
     * @param {(draftState: object) => void} mutator - Mutation function.
     * @returns {void}
     */
    update(mutator) {
        const draft = this.getState();
        mutator(draft);
        this.setState(draft);
    }
}

