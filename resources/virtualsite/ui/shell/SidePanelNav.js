const PANEL_CONFIG = [
    { key: 'explorer', label: 'File Explorer', short: 'F' },
    { key: 'siteSetting', label: 'Site Setting', short: 'S' },
    { key: 'setting', label: 'Setting', short: 'C' },
];

/**
 * Icon-first side panel section switcher.
 */
export class SidePanelNav {
    /**
     * Create side panel nav.
     * @param {{ host: HTMLElement, onChange: (key: string | null) => void }} options - Nav options.
     */
    constructor(options) {
        /** @type {HTMLElement} */
        this.host = options.host;
        /** @type {(key: string | null) => void} */
        this.onChange = options.onChange;
        /** @type {string | null} */
        this.activeKey = null;
    }

    /**
     * Mount nav buttons.
     * @returns {void}
     */
    mount() {
        this.host.replaceChildren();
        PANEL_CONFIG.forEach((panel) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'vsb-side-nav-btn';
            button.dataset.panelKey = panel.key;
            button.title = panel.label;
            button.innerHTML = `
                <span class="vsb-side-nav-icon">${panel.short}</span>
                <span class="vsb-side-nav-text">${panel.label}</span>
            `;
            button.addEventListener('click', () => this.toggle(panel.key));
            this.host.appendChild(button);
        });
    }

    /**
     * Toggle panel section.
     * @param {string} panelKey - Panel key.
     * @returns {void}
     */
    toggle(panelKey) {
        this.activeKey = this.activeKey === panelKey ? null : panelKey;
        this.syncButtons();
        this.onChange(this.activeKey);
    }

    /**
     * Force set active section.
     * @param {string | null} panelKey - Panel key.
     * @returns {void}
     */
    setActive(panelKey) {
        this.activeKey = panelKey;
        this.syncButtons();
    }

    /**
     * Sync active css states.
     * @returns {void}
     */
    syncButtons() {
        this.host.querySelectorAll('.vsb-side-nav-btn').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.classList.toggle('is-active', button.dataset.panelKey === this.activeKey);
        });
    }

    /**
     * Resolve side panel label by key.
     * @param {string | null} panelKey - Panel key.
     * @returns {string} Panel label.
     */
    static labelFor(panelKey) {
        const found = PANEL_CONFIG.find((panel) => panel.key === panelKey);
        return found ? found.label : '';
    }
}

