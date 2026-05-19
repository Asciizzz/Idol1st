/**
 * Settings panel with theme management.
 */
export class SettingsPanel {
    /**
     * Create settings panel.
     * @param {{
     *   getThemes: () => Array<{ id: string, name: string, kind: "builtin" | "custom" }>,
     *   getActiveThemeId: () => string,
     *   onSetActiveTheme: (themeId: string) => boolean,
     *   onImportThemeJson: (jsonText: string) => { ok: boolean, errors: string[] },
     *   onDeleteTheme: (themeId: string) => { ok: boolean, reason: string | null }
     * }} options - Panel options.
     */
    constructor(options) {
        /** @type {() => Array<{ id: string, name: string, kind: "builtin" | "custom" }>} */
        this.getThemes = options.getThemes;
        /** @type {() => string} */
        this.getActiveThemeId = options.getActiveThemeId;
        /** @type {(themeId: string) => boolean} */
        this.onSetActiveTheme = options.onSetActiveTheme;
        /** @type {(jsonText: string) => { ok: boolean, errors: string[] }} */
        this.onImportThemeJson = options.onImportThemeJson;
        /** @type {(themeId: string) => { ok: boolean, reason: string | null }} */
        this.onDeleteTheme = options.onDeleteTheme;
        /** @type {HTMLElement | null} */
        this.root = null;
        /** @type {string} */
        this.message = '';
        /** @type {boolean} */
        this.isError = false;
    }

    /**
     * Mount settings panel.
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
     * Render settings panel content.
     * @returns {void}
     */
    render() {
        if (!this.root) {
            return;
        }

        const themes = this.getThemes();
        const activeThemeId = this.getActiveThemeId();
        const optionsMarkup = themes.map((theme) => `
            <option value="${this.escapeHtml(theme.id)}" ${theme.id === activeThemeId ? 'selected' : ''}>
                ${this.escapeHtml(theme.name)}${theme.kind === 'builtin' ? ' (Built-in)' : ''}
            </option>
        `).join('');

        this.root.innerHTML = `
            <section class="vsb-panel-group">
                <h3>Color Theme</h3>
                <label class="vsb-field-label">Active Theme</label>
                <select class="vsb-input" data-role="theme-select">${optionsMarkup}</select>
                <div class="vsb-theme-actions">
                    <button type="button" class="vsb-btn vsb-btn-primary" data-role="theme-apply">Apply</button>
                    <button type="button" class="vsb-btn is-danger" data-role="theme-delete">Delete Selected</button>
                </div>
            </section>
            <section class="vsb-panel-group">
                <h3>Custom Theme JSON</h3>
                <textarea class="vsb-textarea" data-role="theme-json" placeholder='{"id":"my-theme","name":"My Theme","kind":"custom","tokens":{}}'></textarea>
                <div class="vsb-theme-actions">
                    <button type="button" class="vsb-btn vsb-btn-primary" data-role="theme-import">Import JSON</button>
                    <input type="file" accept=".json,application/json" data-role="theme-file" />
                </div>
                <div class="vsb-drop-zone" data-role="theme-drop-zone">Drop .json file here</div>
                ${this.message ? `<div class="${this.isError ? 'vsb-inline-error' : 'vsb-inline-help'}">${this.escapeHtml(this.message)}</div>` : ''}
            </section>
        `;

        this.bindEvents();
        this.syncDeleteState();
    }

    /**
     * Bind panel events.
     * @returns {void}
     */
    bindEvents() {
        if (!this.root) {
            return;
        }

        this.root.querySelector('[data-role="theme-apply"]')?.addEventListener('click', () => {
            const select = /** @type {HTMLSelectElement | null} */ (this.root?.querySelector('[data-role="theme-select"]'));
            const themeId = select ? select.value : '';
            if (!themeId) {
                return;
            }
            this.onSetActiveTheme(themeId);
            this.message = 'Theme applied.';
            this.isError = false;
            this.render();
        });

        this.root.querySelector('[data-role="theme-delete"]')?.addEventListener('click', () => {
            const select = /** @type {HTMLSelectElement | null} */ (this.root?.querySelector('[data-role="theme-select"]'));
            const themeId = select ? select.value : '';
            if (!themeId) {
                return;
            }
            const result = this.onDeleteTheme(themeId);
            this.message = result.ok ? 'Theme deleted.' : String(result.reason || 'Failed to delete theme.');
            this.isError = !result.ok;
            this.render();
        });

        this.root.querySelector('[data-role="theme-import"]')?.addEventListener('click', () => {
            const textarea = /** @type {HTMLTextAreaElement | null} */ (this.root?.querySelector('[data-role="theme-json"]'));
            const payload = textarea ? textarea.value : '';
            const result = this.onImportThemeJson(payload);
            this.message = result.ok ? 'Theme imported.' : result.errors.join(' ');
            this.isError = !result.ok;
            this.render();
        });

        const fileInput = /** @type {HTMLInputElement | null} */ (this.root.querySelector('[data-role="theme-file"]'));
        if (fileInput) {
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
                if (!file) {
                    return;
                }
                const content = await file.text();
                const result = this.onImportThemeJson(content);
                this.message = result.ok ? 'Theme imported from file.' : result.errors.join(' ');
                this.isError = !result.ok;
                this.render();
            });
        }

        const dropZone = this.root.querySelector('[data-role="theme-drop-zone"]');
        dropZone?.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropZone.classList.add('is-drag-over');
        });
        dropZone?.addEventListener('dragleave', () => {
            dropZone.classList.remove('is-drag-over');
        });
        dropZone?.addEventListener('drop', async (event) => {
            event.preventDefault();
            dropZone.classList.remove('is-drag-over');
            const file = event.dataTransfer?.files && event.dataTransfer.files[0]
                ? event.dataTransfer.files[0]
                : null;
            if (!file) {
                return;
            }
            const content = await file.text();
            const result = this.onImportThemeJson(content);
            this.message = result.ok ? 'Theme imported from drop.' : result.errors.join(' ');
            this.isError = !result.ok;
            this.render();
        });

        this.root.querySelector('[data-role="theme-select"]')?.addEventListener('change', () => {
            this.syncDeleteState();
        });
    }

    /**
     * Sync delete button disabled state based on built-in selection.
     * @returns {void}
     */
    syncDeleteState() {
        if (!this.root) {
            return;
        }

        const select = /** @type {HTMLSelectElement | null} */ (this.root.querySelector('[data-role="theme-select"]'));
        const deleteButton = /** @type {HTMLButtonElement | null} */ (this.root.querySelector('[data-role="theme-delete"]'));
        if (!select || !deleteButton) {
            return;
        }

        const selectedTheme = this.getThemes().find((theme) => theme.id === select.value);
        deleteButton.disabled = !selectedTheme || selectedTheme.kind === 'builtin';
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

