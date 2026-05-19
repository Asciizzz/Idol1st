/**
 * File explorer panel showing pages/styles/scripts.
 */
export class ExplorerPanel {
    /**
     * Create explorer panel.
     * @param {{
     *   getState: () => object,
     *   onSelectPage: (pageId: string) => void,
     *   onSelectStyle: (styleId: string) => void,
     *   onSelectScript: (scriptId: string) => void,
     *   onCreateStyle: () => void,
     *   onCreateScript: () => void
     * }} options - Panel options.
     */
    constructor(options) {
        /** @type {() => object} */
        this.getState = options.getState;
        /** @type {(pageId: string) => void} */
        this.onSelectPage = options.onSelectPage;
        /** @type {(styleId: string) => void} */
        this.onSelectStyle = options.onSelectStyle;
        /** @type {(scriptId: string) => void} */
        this.onSelectScript = options.onSelectScript;
        /** @type {() => void} */
        this.onCreateStyle = options.onCreateStyle;
        /** @type {() => void} */
        this.onCreateScript = options.onCreateScript;
        /** @type {HTMLElement | null} */
        this.root = null;
    }

    /**
     * Mount panel into target.
     * @param {HTMLElement} host - Panel host.
     * @returns {void}
     */
    mount(host) {
        const root = document.createElement('div');
        root.className = 'vsb-panel';
        host.replaceChildren(root);
        this.root = root;
        this.render();
    }

    /**
     * Re-render panel content.
     * @returns {void}
     */
    render() {
        if (!this.root) {
            return;
        }

        const state = this.getState();
        const pages = state?.resources?.pages?.byId || {};
        const pageOrder = Array.isArray(state?.resources?.pages?.order) ? state.resources.pages.order : Object.keys(pages);
        const styles = state?.resources?.styles?.byId || {};
        const scripts = state?.resources?.scripts?.byId || {};

        const pageList = pageOrder.map((pageId) => {
            const page = pages[pageId];
            if (!page) {
                return '';
            }
            return `<button type="button" class="vsb-list-btn" data-page-id="${this.escapeHtml(pageId)}">${this.escapeHtml(page.title || pageId)}</button>`;
        }).join('');

        const styleList = Object.values(styles)
            .map((style) => `<button type="button" class="vsb-list-btn" data-style-id="${this.escapeHtml(style.id)}">${this.escapeHtml(style.name || style.id)}</button>`)
            .join('');

        const scriptList = Object.values(scripts)
            .map((script) => `<button type="button" class="vsb-list-btn" data-script-id="${this.escapeHtml(script.id)}">${this.escapeHtml(script.name || script.id)}</button>`)
            .join('');

        this.root.innerHTML = `
            <section class="vsb-panel-group">
                <h3>Pages</h3>
                <div class="vsb-list">${pageList || '<div class="vsb-list-empty">No pages.</div>'}</div>
            </section>
            <section class="vsb-panel-group">
                <h3>Styles</h3>
                <div class="vsb-list">${styleList || '<div class="vsb-list-empty">No styles.</div>'}</div>
                <button type="button" class="vsb-btn" data-create-style>Create Style</button>
            </section>
            <section class="vsb-panel-group">
                <h3>Scripts</h3>
                <div class="vsb-list">${scriptList || '<div class="vsb-list-empty">No scripts.</div>'}</div>
                <button type="button" class="vsb-btn" data-create-script>Create Script</button>
            </section>
        `;

        this.root.querySelectorAll('[data-page-id]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const pageId = button.dataset.pageId || '';
                if (!pageId) {
                    return;
                }
                this.onSelectPage(pageId);
            });
        });

        this.root.querySelectorAll('[data-style-id]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const styleId = button.dataset.styleId || '';
                if (!styleId) {
                    return;
                }
                this.onSelectStyle(styleId);
            });
        });

        this.root.querySelectorAll('[data-script-id]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const scriptId = button.dataset.scriptId || '';
                if (!scriptId) {
                    return;
                }
                this.onSelectScript(scriptId);
            });
        });

        this.root.querySelector('[data-create-style]')?.addEventListener('click', () => {
            this.onCreateStyle();
        });

        this.root.querySelector('[data-create-script]')?.addEventListener('click', () => {
            this.onCreateScript();
        });
    }

    /**
     * Escape html text.
     * @param {unknown} value - Raw value.
     * @returns {string} Escaped text.
     */
    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
