/**
 * Right-side node inspector for active page selection.
 */
export class NodeInspectorPanel {
    /**
     * Create node inspector panel.
     * @param {{
     *   getState: () => object,
     *   getActivePageId: () => string | null,
     *   onUpdateNode: (pageId: string, nodeId: string, patch: { tag?: string, text?: string, attrs?: Record<string, string> }) => void,
     *   onSetSelection: (pageId: string, nodeIds: string[]) => void,
     *   onCreateNode: (pageId: string, parentNodeId: string | null) => void
     * }} options - Panel options.
     */
    constructor(options) {
        /** @type {() => object} */
        this.getState = options.getState;
        /** @type {() => string | null} */
        this.getActivePageId = options.getActivePageId;
        /** @type {(pageId: string, nodeId: string, patch: { tag?: string, text?: string, attrs?: Record<string, string> }) => void} */
        this.onUpdateNode = options.onUpdateNode;
        /** @type {(pageId: string, nodeIds: string[]) => void} */
        this.onSetSelection = options.onSetSelection;
        /** @type {(pageId: string, parentNodeId: string | null) => void} */
        this.onCreateNode = options.onCreateNode;
        /** @type {HTMLElement | null} */
        this.root = null;
    }

    /**
     * Mount inspector panel.
     * @param {HTMLElement} host - Inspector host container.
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
     * Render inspector contents.
     * @returns {void}
     */
    render() {
        if (!this.root) {
            return;
        }

        const pageId = this.getActivePageId();
        const page = this.getActivePage(pageId);

        if (!pageId || !page) {
            this.root.innerHTML = '<div class="vsb-inline-help">No active page.</div>';
            return;
        }

        const selectedNodeIds = this.normalizeIdArray(Array.isArray(page.activeNodeIds)
            ? page.activeNodeIds
            : (typeof page.activeNodeId === 'string' && page.activeNodeId ? [page.activeNodeId] : []));
        const selectedNodes = selectedNodeIds
            .map((nodeId) => ({ id: nodeId, node: page.nodeById?.[nodeId] || null }))
            .filter((entry) => entry.node);

        const pageSummary = `
            <section class="vsb-panel-group">
                <h3>Page</h3>
                <div class="vsb-inline-help"><strong>${this.escapeHtml(String(page.title || page.id || pageId))}</strong></div>
                <div class="vsb-theme-actions">
                    <button type="button" class="vsb-btn" data-role="clear-selection" ${selectedNodeIds.length === 0 ? 'disabled' : ''}>Clear Selection</button>
                </div>
            </section>
        `;

        if (selectedNodes.length === 0) {
            this.root.innerHTML = `${pageSummary}
                <section class="vsb-panel-group">
                    <h3>Selection</h3>
                    <div class="vsb-inline-help">No node selected. Select mode: <strong>Shift+W</strong>, Add mode: <strong>Shift+A</strong>, Delete mode: <strong>Shift+D</strong>.</div>
                </section>
            `;
            this.bindCommonActions(pageId);
            return;
        }

        const cards = selectedNodes.map((entry) => this.renderNodeCard(entry.id, entry.node)).join('');
        this.root.innerHTML = `
            ${pageSummary}
            <section class="vsb-panel-group">
                <h3>Selection (${selectedNodes.length})</h3>
                ${cards}
            </section>
        `;

        this.bindCommonActions(pageId);
        this.bindNodeCardActions(pageId);
    }

    /**
     * Render one selected node card.
     * @param {string} nodeId - Node id.
     * @param {any} node - Node object.
     * @returns {string} Node card markup.
     */
    renderNodeCard(nodeId, node) {
        const children = Array.isArray(node?.children) ? node.children : [];
        const attrRows = Object.entries(node?.attrs && typeof node.attrs === 'object' ? node.attrs : {})
            .map((entry) => `
                <div class="vsb-grid-two" data-role="attr-row">
                    <input class="vsb-input" data-role="attr-key" value="${this.escapeHtml(String(entry[0]))}" placeholder="attribute" />
                    <input class="vsb-input" data-role="attr-val" value="${this.escapeHtml(String(entry[1]))}" placeholder="value" />
                </div>
            `).join('');

        return `
            <article class="vsb-card" data-node-card="${this.escapeHtml(nodeId)}">
                <h4>${this.escapeHtml(nodeId)}</h4>
                <label class="vsb-field-label">Tag</label>
                <input class="vsb-input" data-role="node-tag" value="${this.escapeHtml(String(node?.tag || 'div'))}" />
                <label class="vsb-field-label">Text</label>
                <textarea class="vsb-textarea" data-role="node-text" ${children.length > 0 ? 'disabled' : ''}>${this.escapeHtml(String(node?.text || ''))}</textarea>
                ${children.length > 0 ? '<div class="vsb-small">Text disabled because this node has children.</div>' : ''}
                <label class="vsb-field-label">Attributes</label>
                <div class="vsb-list" data-role="attr-list">
                    ${attrRows || '<div class="vsb-small">No attributes yet.</div>'}
                </div>
                <div class="vsb-theme-actions">
                    <button type="button" class="vsb-btn" data-role="add-attr">Add Attribute</button>
                    <button type="button" class="vsb-btn" data-role="focus-only">Focus This Node</button>
                    <button type="button" class="vsb-btn vsb-btn-primary" data-role="add-child">Add Child Node</button>
                </div>
            </article>
        `;
    }

    /**
     * Bind top-level common actions.
     * @param {string} pageId - Active page id.
     * @returns {void}
     */
    bindCommonActions(pageId) {
        if (!this.root) {
            return;
        }

        this.root.querySelector('[data-role="clear-selection"]')?.addEventListener('click', () => {
            this.onSetSelection(pageId, []);
        });
    }

    /**
     * Bind per-node card controls.
     * @param {string} pageId - Active page id.
     * @returns {void}
     */
    bindNodeCardActions(pageId) {
        if (!this.root) {
            return;
        }

        this.root.querySelectorAll('[data-node-card]').forEach((node) => {
            const card = /** @type {HTMLElement} */ (node);
            const nodeId = card.getAttribute('data-node-card') || '';
            if (!nodeId) {
                return;
            }

            this.bindTextInput(card, '[data-role="node-tag"]', (value) => {
                this.onUpdateNode(pageId, nodeId, { tag: value || 'div' });
            });

            this.bindTextInput(card, '[data-role="node-text"]', (value) => {
                this.onUpdateNode(pageId, nodeId, { text: value });
            });

            card.querySelector('[data-role="add-attr"]')?.addEventListener('click', () => {
                const list = card.querySelector('[data-role="attr-list"]');
                if (!(list instanceof HTMLElement)) {
                    return;
                }
                const empty = list.querySelector('.vsb-small');
                if (empty) {
                    empty.remove();
                }
                list.insertAdjacentHTML('beforeend', `
                    <div class="vsb-grid-two" data-role="attr-row">
                        <input class="vsb-input" data-role="attr-key" value="" placeholder="attribute" />
                        <input class="vsb-input" data-role="attr-val" value="" placeholder="value" />
                    </div>
                `);
                this.bindAttrList(card, pageId, nodeId);
            });

            card.querySelector('[data-role="focus-only"]')?.addEventListener('click', () => {
                this.onSetSelection(pageId, [nodeId]);
            });

            card.querySelector('[data-role="add-child"]')?.addEventListener('click', () => {
                this.onCreateNode(pageId, nodeId);
            });

            this.bindAttrList(card, pageId, nodeId);
        });
    }

    /**
     * Bind attribute list change handlers for one node card.
     * @param {HTMLElement} card - Node card element.
     * @param {string} pageId - Active page id.
     * @param {string} nodeId - Target node id.
     * @returns {void}
     */
    bindAttrList(card, pageId, nodeId) {
        card.querySelectorAll('[data-role="attr-key"], [data-role="attr-val"]').forEach((node) => {
            const input = /** @type {HTMLInputElement} */ (node);
            input.addEventListener('change', () => {
                const attrs = this.readAttrsFromCard(card);
                this.onUpdateNode(pageId, nodeId, { attrs });
            });
        });
    }

    /**
     * Read attribute rows from a node card.
     * @param {HTMLElement} card - Node card element.
     * @returns {Record<string, string>} Attributes map.
     */
    readAttrsFromCard(card) {
        /** @type {Record<string, string>} */
        const attrs = {};
        card.querySelectorAll('[data-role="attr-row"]').forEach((rowNode) => {
            const row = /** @type {HTMLElement} */ (rowNode);
            const keyInput = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-role="attr-key"]'));
            const valInput = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-role="attr-val"]'));
            const key = String(keyInput?.value || '').trim();
            if (!key || key.startsWith('_')) {
                return;
            }
            attrs[key] = String(valInput?.value || '');
        });
        return attrs;
    }

    /**
     * Bind text-like inputs using both change and blur events.
     * @param {HTMLElement} scope - Parent scope.
     * @param {string} selector - Input selector.
     * @param {(value: string) => void} onChange - Value callback.
     * @returns {void}
     */
    bindTextInput(scope, selector, onChange) {
        scope.querySelectorAll(selector).forEach((node) => {
            const input = /** @type {HTMLInputElement | HTMLTextAreaElement} */ (node);
            const handler = () => {
                onChange(String(input.value || '').trim());
            };
            input.addEventListener('change', handler);
            input.addEventListener('blur', handler);
        });
    }

    /**
     * Resolve active page data by id.
     * @param {string | null} pageId - Candidate page id.
     * @returns {any | null} Page object.
     */
    getActivePage(pageId) {
        if (!pageId) {
            return null;
        }
        const state = this.getState();
        return state?.resources?.pages?.byId?.[pageId] || null;
    }

    /**
     * Normalize unknown list into string id array.
     * @param {unknown} value - Raw list.
     * @returns {string[]} Normalized node id list.
     */
    normalizeIdArray(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return Array.from(new Set(value
            .map((item) => String(item || '').trim())
            .filter(Boolean)));
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
