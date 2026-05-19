/**
 * Create a deep clone of a serializable value.
 * @template T
 * @param {T} value - Value to clone.
 * @returns {T} A cloned value.
 */
export function deepClone(value) {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
}

