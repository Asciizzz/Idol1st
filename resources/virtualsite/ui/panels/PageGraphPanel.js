/**
 * Read-only page node graph panel.
 */
export class PageGraphPanel {
    /**
     * Create graph panel.
     * @param {{ getState: () => object }} options - Panel options.
     */
    constructor(options) {
        /** @type {() => object} */
        this.getState = options.getState;
        /** @type {HTMLElement | null} */
        this.root = null;
        /** @type {string | null} */
        this.pageId = null;
    }

    /**
     * Mount panel.
     * @param {HTMLElement} host - Host element.
     * @returns {void}
     */
    mount(host) {
        const root = document.createElement('div');
        root.className = 'vsb-editor-canvas';
        host.replaceChildren(root);
        this.root = root;
        this.render();
    }

    /**
     * Set page id.
     * @param {string | null} pageId - Page id.
     * @returns {void}
     */
    setPageId(pageId) {
        this.pageId = pageId ? String(pageId) : null;
        this.render();
    }

    /**
     * Render graph panel.
     * @returns {void}
     */
    render() {
        if (!this.root) {
            return;
        }

        const page = this.getActivePage();
        if (!page) {
            this.root.innerHTML = '<div class="vsb-inline-help">Page not found.</div>';
            return;
        }

        const nodeById = page.nodeById && typeof page.nodeById === 'object' ? page.nodeById : {};
        const rootIds = Array.isArray(page.rootNodeIds) ? page.rootNodeIds : [];
        if (rootIds.length === 0) {
            this.root.innerHTML = '<div class="vsb-inline-help">No nodes on this page yet.</div>';
            return;
        }

        const renderNode = (nodeId, depth = 0) => {
            const node = nodeById[nodeId];
            if (!node) {
                return '';
            }
            const tag = this.escapeHtml(String(node.tag || 'div'));
            const text = this.escapeHtml(String(node.text || '').trim() || 'empty');
            const children = Array.isArray(node.children) ? node.children : [];
            const childMarkup = children.map((childId) => renderNode(String(childId), depth + 1)).join('');
            return `
                <div class="vsb-card" style="margin-left:${depth * 1.1}rem;">
                    <h4>&lt;${tag}&gt;</h4>
                    <div class="vsb-small">${text}</div>
                    ${childMarkup}
                </div>
            `;
        };

        this.root.innerHTML = `
            <div class="vsb-editor-toolbar">
                <strong>Graph: ${this.escapeHtml(page.title || page.id)}</strong>
            </div>
            <div class="vsb-split-right">
                ${rootIds.map((rootId) => renderNode(String(rootId), 0)).join('')}
            </div>
        `;
    }

    /**
     * Resolve active page.
     * @returns {any | null} Page object.
     */
    getActivePage() {
        if (!this.pageId) {
            return null;
        }
        const state = this.getState();
        return state?.resources?.pages?.byId?.[this.pageId] || null;
    }

    /**
     * Escape html.
     * @param {unknown} value - Raw value.
     * @returns {string} Escaped html.
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

