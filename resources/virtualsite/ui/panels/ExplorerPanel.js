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
     *   onRenamePage?: (pageId: string, nextTitle: string) => void,
     *   onRenameStyle?: (styleId: string, nextName: string) => void,
     *   onRenameScript?: (scriptId: string, nextName: string) => void,
     *   onDeletePage?: (pageId: string) => void,
     *   onDeleteStyle?: (styleId: string) => void,
     *   onDeleteScript?: (scriptId: string) => void,
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
        /** @type {(pageId: string, nextTitle: string) => void} */
        this.onRenamePage = typeof options.onRenamePage === 'function'
            ? options.onRenamePage
            : () => {};
        /** @type {(styleId: string, nextName: string) => void} */
        this.onRenameStyle = typeof options.onRenameStyle === 'function'
            ? options.onRenameStyle
            : () => {};
        /** @type {(scriptId: string, nextName: string) => void} */
        this.onRenameScript = typeof options.onRenameScript === 'function'
            ? options.onRenameScript
            : () => {};
        /** @type {(pageId: string) => void} */
        this.onDeletePage = typeof options.onDeletePage === 'function'
            ? options.onDeletePage
            : () => {};
        /** @type {(styleId: string) => void} */
        this.onDeleteStyle = typeof options.onDeleteStyle === 'function'
            ? options.onDeleteStyle
            : () => {};
        /** @type {(scriptId: string) => void} */
        this.onDeleteScript = typeof options.onDeleteScript === 'function'
            ? options.onDeleteScript
            : () => {};
        /** @type {() => void} */
        this.onCreateStyle = options.onCreateStyle;
        /** @type {() => void} */
        this.onCreateScript = options.onCreateScript;
        /** @type {HTMLElement | null} */
        this.root = null;
        /** @type {{ kind: 'page' | 'style' | 'script', id: string, value: string } | null} */
        this.renameState = null;
        /** @type {{ kind: 'page' | 'style' | 'script', id: string } | null} */
        this.deleteConfirmState = null;
        /** @type {number | null} */
        this.deleteConfirmTimer = null;
        /** @type {(event: PointerEvent) => void} */
        this.boundDocumentPointerDown = (event) => this.handleDocumentPointerDown(event);
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
        document.removeEventListener('pointerdown', this.boundDocumentPointerDown, true);
        document.addEventListener('pointerdown', this.boundDocumentPointerDown, true);
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
            const pageName = String(page.title || pageId);
            return this.renderExplorerRow('page', pageId, pageName);
        }).join('');

        const styleList = Object.values(styles)
            .map((style) => {
                const styleName = String(style.name || style.id);
                return this.renderExplorerRow('style', style.id, styleName);
            })
            .join('');

        const scriptList = Object.values(scripts)
            .map((script) => {
                const scriptName = String(script.name || script.id);
                return this.renderExplorerRow('script', script.id, scriptName);
            })
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

        this.root.querySelectorAll('[data-select-kind]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const kind = this.parseExplorerKind(button.dataset.selectKind);
                const id = String(button.dataset.selectId || '').trim();
                if (!kind || !id) {
                    return;
                }
                this.handleSelect(kind, id);
            });
            button.addEventListener('dblclick', (event) => {
                event.preventDefault();
                const kind = this.parseExplorerKind(button.dataset.selectKind);
                const id = String(button.dataset.selectId || '').trim();
                const currentName = String(button.dataset.currentName || '').trim();
                if (!kind || !id) {
                    return;
                }
                this.startInlineRename(kind, id, currentName);
            });
        });

        this.root.querySelectorAll('[data-rename-inline-input]').forEach((node) => {
            const input = /** @type {HTMLInputElement} */ (node);
            input.addEventListener('input', () => {
                if (!this.renameState) {
                    return;
                }
                this.renameState.value = input.value;
            });
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.commitInlineRename();
                    return;
                }
                if (event.key === 'Escape') {
                    event.preventDefault();
                    this.cancelInlineRename();
                }
            });
            input.addEventListener('blur', () => {
                this.commitInlineRename();
            });
        });

        this.root.querySelectorAll('[data-delete-kind]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const kind = this.parseExplorerKind(button.dataset.deleteKind);
                const id = String(button.dataset.deleteId || '').trim();
                if (!kind || !id) {
                    return;
                }
                this.handleDeleteClick(kind, id);
            });
        });

        this.root.querySelector('[data-create-style]')?.addEventListener('click', () => {
            this.onCreateStyle();
        });

        this.root.querySelector('[data-create-script]')?.addEventListener('click', () => {
            this.onCreateScript();
        });

        this.focusInlineRenameInput();
    }

    /**
     * Render a single explorer row.
     * @param {'page' | 'style' | 'script'} kind - Resource kind.
     * @param {string} id - Resource id.
     * @param {string} name - Display name.
     * @returns {string} Explorer row html.
     */
    renderExplorerRow(kind, id, name) {
        const isRenaming = this.isSameTarget(this.renameState, kind, id);
        const isDeleteArmed = this.isSameTarget(this.deleteConfirmState, kind, id);
        const nameCell = isRenaming
            ? `<input
                type="text"
                class="vsb-input vsb-explorer-rename-input"
                data-rename-inline-input="1"
                data-rename-kind="${this.escapeHtml(kind)}"
                data-rename-id="${this.escapeHtml(id)}"
                value="${this.escapeHtml(String(this.renameState?.value || name))}"
            >`
            : `<button
                type="button"
                class="vsb-list-btn"
                data-select-kind="${this.escapeHtml(kind)}"
                data-select-id="${this.escapeHtml(id)}"
                data-current-name="${this.escapeHtml(name)}"
            >${this.escapeHtml(name)}</button>`;

        return `
            <div class="vsb-explorer-row">
                ${nameCell}
                <div class="vsb-explorer-actions">
                    <button
                        type="button"
                        class="vsb-btn vsb-mini-btn vsb-delete-btn is-danger${isDeleteArmed ? ' is-armed' : ''}"
                        data-delete-kind="${this.escapeHtml(kind)}"
                        data-delete-id="${this.escapeHtml(id)}"
                    >${isDeleteArmed ? 'Are you sure?' : 'Delete'}</button>
                </div>
            </div>
        `;
    }

    /**
     * Select explorer entry by kind.
     * @param {'page' | 'style' | 'script'} kind - Resource kind.
     * @param {string} id - Resource id.
     * @returns {void}
     */
    handleSelect(kind, id) {
        this.resetDeleteConfirmation();
        if (kind === 'page') {
            this.onSelectPage(id);
            return;
        }
        if (kind === 'style') {
            this.onSelectStyle(id);
            return;
        }
        this.onSelectScript(id);
    }

    /**
     * Start inline rename mode.
     * @param {'page' | 'style' | 'script'} kind - Resource kind.
     * @param {string} id - Resource id.
     * @param {string} currentName - Current display name.
     * @returns {void}
     */
    startInlineRename(kind, id, currentName) {
        this.renameState = {
            kind,
            id,
            value: String(currentName || ''),
        };
        this.resetDeleteConfirmation();
        this.render();
    }

    /**
     * Commit active inline rename.
     * @returns {void}
     */
    commitInlineRename() {
        if (!this.renameState) {
            return;
        }
        const state = this.renameState;
        const nextName = String(state.value || '').trim();
        this.renameState = null;
        if (!nextName) {
            this.render();
            return;
        }
        if (state.kind === 'page') {
            this.onRenamePage(state.id, nextName);
        } else if (state.kind === 'style') {
            this.onRenameStyle(state.id, nextName);
        } else {
            this.onRenameScript(state.id, nextName);
        }
        this.render();
    }

    /**
     * Cancel active inline rename.
     * @returns {void}
     */
    cancelInlineRename() {
        if (!this.renameState) {
            return;
        }
        this.renameState = null;
        this.render();
    }

    /**
     * Handle delete click with confirm state.
     * @param {'page' | 'style' | 'script'} kind - Resource kind.
     * @param {string} id - Resource id.
     * @returns {void}
     */
    handleDeleteClick(kind, id) {
        if (this.renameState) {
            this.commitInlineRename();
        }
        if (this.isSameTarget(this.deleteConfirmState, kind, id)) {
            this.resetDeleteConfirmation();
            if (kind === 'page') {
                this.onDeletePage(id);
            } else if (kind === 'style') {
                this.onDeleteStyle(id);
            } else {
                this.onDeleteScript(id);
            }
            return;
        }

        this.deleteConfirmState = { kind, id };
        if (this.deleteConfirmTimer !== null) {
            window.clearTimeout(this.deleteConfirmTimer);
        }
        this.deleteConfirmTimer = window.setTimeout(() => {
            this.resetDeleteConfirmation();
            this.render();
        }, 4200);
        this.render();
    }

    /**
     * Handle outside clicks for delete confirmation state.
     * @param {PointerEvent} event - Pointer event.
     * @returns {void}
     */
    handleDocumentPointerDown(event) {
        if (!this.root || !this.deleteConfirmState) {
            return;
        }
        const target = event.target instanceof Element ? event.target : null;
        if (!target) {
            this.resetDeleteConfirmation();
            this.render();
            return;
        }
        const armedKind = this.deleteConfirmState.kind;
        const armedId = this.deleteConfirmState.id;
        const deleteButton = target.closest('[data-delete-kind][data-delete-id]');
        const deleteKind = this.parseExplorerKind(deleteButton?.getAttribute('data-delete-kind'));
        const deleteId = String(deleteButton?.getAttribute('data-delete-id') || '').trim();
        const isSameDeleteButton = Boolean(deleteKind && deleteId && deleteKind === armedKind && deleteId === armedId);
        if (isSameDeleteButton) {
            return;
        }
        this.resetDeleteConfirmation();
        this.render();
    }

    /**
     * Focus active rename input when present.
     * @returns {void}
     */
    focusInlineRenameInput() {
        if (!this.root || !this.renameState) {
            return;
        }
        const input = this.root.querySelector('[data-rename-inline-input]');
        if (!(input instanceof HTMLInputElement)) {
            return;
        }
        window.requestAnimationFrame(() => {
            input.focus();
            input.select();
        });
    }

    /**
     * Reset delete confirmation state and timer.
     * @returns {void}
     */
    resetDeleteConfirmation() {
        this.deleteConfirmState = null;
        if (this.deleteConfirmTimer !== null) {
            window.clearTimeout(this.deleteConfirmTimer);
        }
        this.deleteConfirmTimer = null;
    }

    /**
     * Parse explorer kind token.
     * @param {unknown} value - Raw token.
     * @returns {'page' | 'style' | 'script' | null} Parsed kind.
     */
    parseExplorerKind(value) {
        const token = String(value || '').trim();
        if (token === 'page' || token === 'style' || token === 'script') {
            return token;
        }
        return null;
    }

    /**
     * Compare state target against kind/id pair.
     * @param {{ kind: 'page' | 'style' | 'script', id: string } | null} target - Candidate target.
     * @param {'page' | 'style' | 'script'} kind - Expected kind.
     * @param {string} id - Expected id.
     * @returns {boolean} True when target matches.
     */
    isSameTarget(target, kind, id) {
        if (!target) {
            return false;
        }
        return target.kind === kind && target.id === id;
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
