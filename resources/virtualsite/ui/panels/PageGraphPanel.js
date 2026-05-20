const BODY_NODE_ID = '__body__';

/**
 * Interactive page graph editor panel.
 */
export class PageGraphPanel {
    /**
     * Create graph panel.
     * @param {{
     *   getState: () => object,
     *   onUpdateNodeGraph?: (pageId: string, nodeId: string, graphPatch: { x?: number, y?: number, collapsed?: boolean }) => void,
     *   onUpdateNodeData?: (pageId: string, nodeId: string, patch: { tag?: string, text?: string, attrs?: Record<string, string> }) => void,
     *   onReparentNode?: (pageId: string, nodeId: string, targetParentId: string | null) => boolean
     * }} options - Panel options.
     */
    constructor(options) {
        /** @type {() => object} */
        this.getState = options.getState;
        /** @type {(pageId: string, nodeId: string, graphPatch: { x?: number, y?: number, collapsed?: boolean }) => void} */
        this.onUpdateNodeGraph = typeof options.onUpdateNodeGraph === 'function'
            ? options.onUpdateNodeGraph
            : () => {};
        /** @type {(pageId: string, nodeId: string, patch: { tag?: string, text?: string, attrs?: Record<string, string> }) => void} */
        this.onUpdateNodeData = typeof options.onUpdateNodeData === 'function'
            ? options.onUpdateNodeData
            : () => {};
        /** @type {(pageId: string, nodeId: string, targetParentId: string | null) => boolean} */
        this.onReparentNode = typeof options.onReparentNode === 'function'
            ? options.onReparentNode
            : () => false;
        /** @type {HTMLElement | null} */
        this.root = null;
        /** @type {string | null} */
        this.pageId = null;
        /** @type {number} */
        this.panX = 24;
        /** @type {number} */
        this.panY = 24;
    }

    /**
     * Mount panel.
     * @param {HTMLElement} host - Host element.
     * @returns {void}
     */
    mount(host) {
        const root = document.createElement('div');
        root.className = 'vsb-graph-canvas';
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

        const graphNodes = this.collectGraphNodes(page);
        const world = this.computeWorldBounds(graphNodes);
        this.root.innerHTML = `
            <div class="vsb-graph-viewport" data-role="graph-viewport">
                <div
                    class="vsb-graph-world"
                    data-role="graph-world"
                    style="width:${world.width}px; height:${world.height}px; transform: translate(${this.panX}px, ${this.panY}px);"
                >
                    <svg class="vsb-graph-links" data-role="graph-links" width="${world.width}" height="${world.height}">
                        <defs>
                            <marker id="vsbGraphArrowTip" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
                                <path d="M0,0 L10,4 L0,8 Z" />
                            </marker>
                        </defs>
                    </svg>
                    <div class="vsb-graph-node-layer">
                        ${graphNodes.map((entry) => this.renderNode(entry)).join('')}
                    </div>
                </div>
            </div>
        `;

        const viewport = /** @type {HTMLElement | null} */ (this.root.querySelector('[data-role="graph-viewport"]'));
        const worldNode = /** @type {HTMLElement | null} */ (this.root.querySelector('[data-role="graph-world"]'));
        if (!viewport || !worldNode) {
            return;
        }
        this.bindViewportPan(viewport, worldNode);
        this.bindNodeEditors(page.id);
        this.bindNodeDragging(page.id, viewport);
        this.drawConnections(page.id);
    }

    /**
     * Render node card.
     * @param {{ id: string, node: any }} entry - Node entry.
     * @returns {string} Node card markup.
     */
    renderNode(entry) {
        const node = entry.node || {};
        const graph = node.graph && typeof node.graph === 'object' ? node.graph : {};
        const x = Number.isFinite(Number(graph.x)) ? Number(graph.x) : 120;
        const y = Number.isFinite(Number(graph.y)) ? Number(graph.y) : 90;
        const collapsed = Boolean(graph.collapsed);
        const children = Array.isArray(node.children) ? node.children : [];
        const hasChildren = children.length > 0;
        const attrs = node.attrs && typeof node.attrs === 'object' ? node.attrs : {};
        const attrRows = Object.entries(attrs).map((entryRow) => `
            <div class="vsb-graph-attr-row" data-role="attr-row">
                <input class="vsb-input" data-role="attr-key" placeholder="attribute" value="${this.escapeHtml(String(entryRow[0]))}" />
                <input class="vsb-input" data-role="attr-val" placeholder="value" value="${this.escapeHtml(String(entryRow[1]))}" />
            </div>
        `).join('');

        return `
            <article
                class="vsb-graph-node ${collapsed ? 'is-collapsed' : ''}"
                data-node-id="${this.escapeHtml(entry.id)}"
                style="left:${x}px; top:${y}px;"
            >
                <header class="vsb-graph-node-head" data-role="drag-handle">
                    <button type="button" class="vsb-graph-collapse-btn" data-role="toggle-collapse" title="Collapse Node">
                        ${collapsed ? '+' : '-'}
                    </button>
                    <span class="vsb-graph-node-title">&lt;${this.escapeHtml(String(node.tag || 'div'))}&gt;</span>
                </header>
                <section class="vsb-graph-node-body">
                    <label class="vsb-field-label">Tag</label>
                    <input class="vsb-input" data-role="node-tag" value="${this.escapeHtml(String(node.tag || 'div'))}" />
                    ${hasChildren
        ? '<div class="vsb-small">Text field hidden because this node has children.</div>'
        : `<label class="vsb-field-label">Text</label>
                    <textarea class="vsb-textarea vsb-graph-node-text" data-role="node-text">${this.escapeHtml(String(node.text || ''))}</textarea>`}
                    <label class="vsb-field-label">Attributes</label>
                    <div class="vsb-graph-attrs" data-role="attr-list">
                        ${attrRows}
                        <div class="vsb-graph-attr-row" data-role="attr-row">
                            <input class="vsb-input" data-role="attr-key" placeholder="attribute" value="" />
                            <input class="vsb-input" data-role="attr-val" placeholder="value" value="" />
                        </div>
                    </div>
                </section>
            </article>
        `;
    }

    /**
     * Bind middle-click panning on graph viewport.
     * @param {HTMLElement} viewport - Graph viewport.
     * @param {HTMLElement} worldNode - Graph world node.
     * @returns {void}
     */
    bindViewportPan(viewport, worldNode) {
        viewport.addEventListener('pointerdown', (event) => {
            if (event.button !== 1) {
                return;
            }
            event.preventDefault();
            const startX = event.clientX;
            const startY = event.clientY;
            const initialPanX = this.panX;
            const initialPanY = this.panY;

            const onMove = (moveEvent) => {
                this.panX = initialPanX + (moveEvent.clientX - startX);
                this.panY = initialPanY + (moveEvent.clientY - startY);
                worldNode.style.transform = `translate(${this.panX}px, ${this.panY}px)`;
            };

            const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
        });
    }

    /**
     * Bind node data editors.
     * @param {string} pageId - Active page id.
     * @returns {void}
     */
    bindNodeEditors(pageId) {
        if (!this.root) {
            return;
        }

        this.root.querySelectorAll('[data-node-id]').forEach((node) => {
            const card = /** @type {HTMLElement} */ (node);
            const nodeId = String(card.getAttribute('data-node-id') || '');
            if (!nodeId) {
                return;
            }

            card.querySelector('[data-role="toggle-collapse"]')?.addEventListener('click', (event) => {
                event.preventDefault();
                const isCollapsed = card.classList.contains('is-collapsed');
                this.onUpdateNodeGraph(pageId, nodeId, { collapsed: !isCollapsed });
            });

            this.bindTextInput(card, '[data-role="node-tag"]', (value) => {
                this.onUpdateNodeData(pageId, nodeId, { tag: value || 'div' });
            });

            this.bindTextInput(card, '[data-role="node-text"]', (value) => {
                this.onUpdateNodeData(pageId, nodeId, { text: value });
            });
            card.querySelectorAll('[data-role="node-text"]').forEach((textNode) => {
                const textarea = /** @type {HTMLTextAreaElement} */ (textNode);
                this.resizeNodeTextArea(textarea);
                textarea.addEventListener('input', () => {
                    this.resizeNodeTextArea(textarea);
                });
            });

            card.querySelectorAll('[data-role="attr-key"], [data-role="attr-val"]').forEach((inputNode) => {
                const input = /** @type {HTMLInputElement} */ (inputNode);
                const syncAttrs = () => {
                    this.onUpdateNodeData(pageId, nodeId, { attrs: this.readAttrsFromNodeCard(card) });
                };
                input.addEventListener('change', syncAttrs);
                input.addEventListener('blur', syncAttrs);
            });
        });
    }

    /**
     * Bind node dragging and ctrl-drop reparent behavior.
     * @param {string} pageId - Active page id.
     * @param {HTMLElement} viewport - Viewport element.
     * @returns {void}
     */
    bindNodeDragging(pageId, viewport) {
        if (!this.root) {
            return;
        }

        const clearReparentTargetClass = () => {
            this.root?.querySelectorAll('.vsb-graph-node.is-reparent-target').forEach((node) => {
                node.classList.remove('is-reparent-target');
            });
        };

        this.root.querySelectorAll('[data-role="drag-handle"]').forEach((node) => {
            const handle = /** @type {HTMLElement} */ (node);
            const card = /** @type {HTMLElement | null} */ (handle.closest('[data-node-id]'));
            const nodeId = String(card?.getAttribute('data-node-id') || '');
            if (!card || !nodeId) {
                return;
            }

            handle.addEventListener('pointerdown', (event) => {
                if (event.button !== 0) {
                    return;
                }
                const target = /** @type {Element} */ (event.target);
                if (target.closest('input, textarea, select, button')) {
                    return;
                }
                event.preventDefault();

                const startX = Number.parseFloat(card.style.left || '0') || 0;
                const startY = Number.parseFloat(card.style.top || '0') || 0;
                const originClientX = event.clientX;
                const originClientY = event.clientY;

                const onMove = (moveEvent) => {
                    const nextX = startX + (moveEvent.clientX - originClientX);
                    const nextY = startY + (moveEvent.clientY - originClientY);
                    card.style.left = `${nextX}px`;
                    card.style.top = `${nextY}px`;
                    this.drawConnections(pageId);

                    clearReparentTargetClass();
                    if (moveEvent.ctrlKey) {
                        const hoverNode = this.resolveNodeCardFromPoint(moveEvent.clientX, moveEvent.clientY);
                        const hoverId = String(hoverNode?.getAttribute('data-node-id') || '');
                        if (hoverNode && hoverId && hoverId !== nodeId) {
                            hoverNode.classList.add('is-reparent-target');
                        }
                    }
                };

                const onUp = (upEvent) => {
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onUp);
                    window.removeEventListener('pointercancel', onUp);

                    const finalX = Number.parseFloat(card.style.left || '0') || 0;
                    const finalY = Number.parseFloat(card.style.top || '0') || 0;
                    this.onUpdateNodeGraph(pageId, nodeId, { x: finalX, y: finalY });

                    if (upEvent.ctrlKey) {
                        const targetCard = this.resolveNodeCardFromPoint(upEvent.clientX, upEvent.clientY);
                        const targetId = String(targetCard?.getAttribute('data-node-id') || '');
                        if (targetId && targetId !== nodeId) {
                            this.onReparentNode(pageId, nodeId, targetId);
                        }
                    }

                    clearReparentTargetClass();
                };

                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
                window.addEventListener('pointercancel', onUp);
            });
        });

        viewport.addEventListener('mouseleave', () => {
            clearReparentTargetClass();
        });
    }

    /**
     * Draw curved relationship links between nodes.
     * @param {string} pageId - Active page id.
     * @returns {void}
     */
    drawConnections(pageId) {
        if (!this.root) {
            return;
        }

        const svg = /** @type {SVGSVGElement | null} */ (this.root.querySelector('[data-role="graph-links"]'));
        if (!svg) {
            return;
        }
        const page = this.getActivePage();
        if (!page || page.id !== pageId) {
            return;
        }

        const nodeById = page.nodeById && typeof page.nodeById === 'object' ? page.nodeById : {};
        const cardById = new Map();
        this.root.querySelectorAll('[data-node-id]').forEach((node) => {
            const card = /** @type {HTMLElement} */ (node);
            const id = String(card.getAttribute('data-node-id') || '');
            if (id) {
                cardById.set(id, card);
            }
        });

        const defs = svg.querySelector('defs');
        svg.replaceChildren();
        if (defs) {
            svg.appendChild(defs);
        }

        Object.entries(nodeById).forEach((entry) => {
            const nodeId = String(entry[0] || '');
            if (!nodeId || nodeId === BODY_NODE_ID) {
                return;
            }
            const node = entry[1] && typeof entry[1] === 'object' ? entry[1] : {};
            const parentId = typeof node.parent === 'string' ? node.parent : null;
            if (!parentId || parentId === BODY_NODE_ID) {
                return;
            }

            const sourceCard = cardById.get(parentId);
            const targetCard = cardById.get(nodeId);
            if (!sourceCard || !targetCard) {
                return;
            }

            const x1 = sourceCard.offsetLeft + sourceCard.offsetWidth - 8;
            const y1 = sourceCard.offsetTop + (sourceCard.offsetHeight / 2);
            const x2 = targetCard.offsetLeft + 8;
            const y2 = targetCard.offsetTop + (targetCard.offsetHeight / 2);
            const bend = Math.max(40, Math.abs(x2 - x1) * 0.45);
            const c1x = x1 + bend;
            const c2x = x2 - bend;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', 'vsb-graph-link');
            path.setAttribute('d', `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`);
            path.setAttribute('marker-end', 'url(#vsbGraphArrowTip)');
            svg.appendChild(path);
        });
    }

    /**
     * Resolve node card at viewport coordinates.
     * @param {number} clientX - Pointer x.
     * @param {number} clientY - Pointer y.
     * @returns {HTMLElement | null} Node card element.
     */
    resolveNodeCardFromPoint(clientX, clientY) {
        const target = document.elementFromPoint(clientX, clientY);
        if (!(target instanceof Element)) {
            return null;
        }
        const node = target.closest('[data-node-id]');
        return node instanceof HTMLElement ? node : null;
    }

    /**
     * Read attribute rows from a node card.
     * @param {HTMLElement} card - Node card.
     * @returns {Record<string, string>} Attr map.
     */
    readAttrsFromNodeCard(card) {
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
     * Bind text-like inputs using change/blur.
     * @param {HTMLElement} scope - Scope element.
     * @param {string} selector - Input selector.
     * @param {(value: string) => void} callback - Change callback.
     * @returns {void}
     */
    bindTextInput(scope, selector, callback) {
        scope.querySelectorAll(selector).forEach((node) => {
            const input = /** @type {HTMLInputElement | HTMLTextAreaElement} */ (node);
            const emit = () => {
                callback(String(input.value || '').trim());
            };
            input.addEventListener('change', emit);
            input.addEventListener('blur', emit);
        });
    }

    /**
     * Resize a node text area to content height with max clamp.
     * @param {HTMLTextAreaElement} textarea - Text area element.
     * @returns {void}
     */
    resizeNodeTextArea(textarea) {
        if (!(textarea instanceof HTMLTextAreaElement)) {
            return;
        }
        textarea.style.height = 'auto';
        const minHeight = 70;
        const maxHeight = 180;
        const next = Math.min(maxHeight, Math.max(minHeight, textarea.scrollHeight));
        textarea.style.height = `${next}px`;
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }

    /**
     * Collect non-body graph nodes.
     * @param {any} page - Page object.
     * @returns {Array<{ id: string, node: any }>} Graph nodes.
     */
    collectGraphNodes(page) {
        const nodeById = page.nodeById && typeof page.nodeById === 'object' ? page.nodeById : {};
        return Object.entries(nodeById)
            .filter((entry) => String(entry[0] || '') !== BODY_NODE_ID)
            .map((entry) => ({
                id: String(entry[0] || ''),
                node: entry[1] && typeof entry[1] === 'object' ? entry[1] : {},
            }));
    }

    /**
     * Compute world size bounds for node graph.
     * @param {Array<{ id: string, node: any }>} nodes - Graph nodes.
     * @returns {{ width: number, height: number }} World dimensions.
     */
    computeWorldBounds(nodes) {
        let maxX = 0;
        let maxY = 0;
        nodes.forEach((entry) => {
            const graph = entry.node?.graph && typeof entry.node.graph === 'object' ? entry.node.graph : {};
            const x = Number.isFinite(Number(graph.x)) ? Number(graph.x) : 120;
            const y = Number.isFinite(Number(graph.y)) ? Number(graph.y) : 90;
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });
        return {
            width: Math.max(1800, Math.round(maxX + 520)),
            height: Math.max(1100, Math.round(maxY + 360)),
        };
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
