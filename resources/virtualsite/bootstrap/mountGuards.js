const MOUNT_ATTR = 'data-vsb-mounted';

/**
 * Ensure host can mount a builder instance.
 * @param {Element | null | undefined} host - Host element.
 * @returns {HTMLElement} Validated host element.
 */
export function assertMountHost(host) {
    if (!(host instanceof HTMLElement)) {
        throw new Error('VirtualSiteBuilder: host must be a valid HTMLElement.');
    }

    if (host.getAttribute(MOUNT_ATTR) === 'true') {
        throw new Error('VirtualSiteBuilder: host already has a mounted instance.');
    }

    return host;
}

/**
 * Mark host as mounted.
 * @param {HTMLElement} host - Host element.
 * @returns {void}
 */
export function markMounted(host) {
    host.setAttribute(MOUNT_ATTR, 'true');
}

/**
 * Mark host as unmounted.
 * @param {HTMLElement} host - Host element.
 * @returns {void}
 */
export function markUnmounted(host) {
    host.removeAttribute(MOUNT_ATTR);
}

