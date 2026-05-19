import { deepClone } from '../core/DeepClone.js';

/**
 * Render selected page into iframe runtime host.
 */
export class IframeRuntime {
    /**
     * Create runtime renderer.
     * @param {{
     *   host: HTMLElement,
     *   getState: () => object,
     *   getToolState?: () => { mode: string, deleteMode: string },
     *   onInteraction?: (payload: {
     *     type: 'select' | 'select-overlap' | 'clear-selection' | 'add' | 'delete' | 'drop' | 'set-tool-select' | 'set-tool-add' | 'set-tool-delete' | 'toggle-delete-mode',
     *     pageId: string,
     *     nodeId?: string | null,
     *     nodeIds?: string[] | null,
     *     targetNodeId?: string | null,
     *     sourceNodeId?: string | null,
     *     ctrlKey?: boolean,
     *     clientX?: number,
     *     clientY?: number
     *   }) => void,
     *   canDrop?: (payload: { pageId: string, targetNodeId: string, sourceNodeId: string | null }) => boolean
     * }} options - Runtime options.
     */
    constructor(options) {
        /** @type {HTMLElement} */
        this.host = options.host;
        /** @type {() => object} */
        this.getState = options.getState;
        /** @type {(() => { mode: string, deleteMode: string }) | null} */
        this.getToolState = typeof options.getToolState === 'function' ? options.getToolState : null;
        /** @type {((payload: {
         *   type: 'select' | 'select-overlap' | 'clear-selection' | 'add' | 'delete' | 'drop' | 'set-tool-select' | 'set-tool-add' | 'set-tool-delete' | 'toggle-delete-mode',
         *   pageId: string,
         *   nodeId?: string | null,
         *   nodeIds?: string[] | null,
         *   targetNodeId?: string | null,
         *   sourceNodeId?: string | null,
         *   ctrlKey?: boolean,
         *   clientX?: number,
         *   clientY?: number
         * }) => void) | null} */
        this.onInteraction = typeof options.onInteraction === 'function' ? options.onInteraction : null;
        /** @type {((payload: { pageId: string, targetNodeId: string, sourceNodeId: string | null }) => boolean) | null} */
        this.canDrop = typeof options.canDrop === 'function' ? options.canDrop : null;
        /** @type {HTMLIFrameElement | null} */
        this.frame = null;
        /** @type {string | null} */
        this.activePageId = null;
        /** @type {string | null} */
        this.dragSourceNodeId = null;
        /** @type {HTMLElement | null} */
        this.activeDropTargetNode = null;
        /** @type {{ key: string, index: number }} */
        this.selectionCycle = { key: '', index: -1 };
    }

    /**
     * Mount iframe runtime.
     * @returns {void}
     */
    mount() {
        this.host.replaceChildren();
        const frame = document.createElement('iframe');
        frame.className = 'vsb-render-frame';
        frame.setAttribute('title', 'VirtualSite Preview');
        this.host.appendChild(frame);
        this.frame = frame;
        this.refresh();
    }

    /**
     * Set active page id for render.
     * @param {string | null} pageId - Target page id.
     * @returns {void}
     */
    setActivePage(pageId) {
        this.activePageId = pageId ? String(pageId) : null;
        this.refresh();
    }

    /**
     * Re-render active page.
     * @returns {void}
     */
    refresh() {
        if (!(this.frame instanceof HTMLIFrameElement)) {
            return;
        }

        const state = this.getState();
        const pages = state?.resources?.pages?.byId || {};
        const order = Array.isArray(state?.resources?.pages?.order)
            ? state.resources.pages.order
            : Object.keys(pages);
        const startPageId = state?.resources?.pages?.startPageId || order[0] || null;
        const pageId = this.activePageId && pages[this.activePageId] ? this.activePageId : startPageId;
        if (!pageId || !pages[pageId]) {
            this.writeFrame('<!DOCTYPE html><html><body></body></html>', null);
            return;
        }

        this.activePageId = pageId;
        const page = deepClone(pages[pageId]);
        const html = this.buildHtml(state, page);
        this.writeFrame(html, pageId);
    }

    /**
     * Write html content into iframe document.
     * @param {string} html - Full document html.
     * @param {string | null} pageId - Rendered page id.
     * @returns {void}
     */
    writeFrame(html, pageId) {
        const doc = this.frame?.contentDocument;
        if (!doc) {
            return;
        }
        doc.open();
        doc.write(html);
        doc.close();
        this.bindEditorInteractions(pageId);
    }

    /**
     * Build full html document string for page.
     * @param {any} state - Store snapshot.
     * @param {any} page - Page object.
     * @returns {string} Full document html.
     */
    buildHtml(state, page) {
        const title = this.escapeHtml(page.title || '');
        const css = this.buildCss(state, page);
        const body = this.buildBody(page);
        const runtimeScript = this.buildRuntimeScript(state, page);
        const editorOverlayCss = this.buildEditorOverlayCss();

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>${css}
${editorOverlayCss}</style>
</head>
<body>${body}${runtimeScript ? `
    <script>${runtimeScript}</script>` : ''}</body>
</html>`;
    }

    /**
     * Build page css from included style ids.
     * @param {any} state - Store snapshot.
     * @param {any} page - Page object.
     * @returns {string} CSS text.
     */
    buildCss(state, page) {
        const styleIds = Array.isArray(page?.includes?.styleIds) ? page.includes.styleIds : [];
        const stylesById = state?.resources?.styles?.byId || {};

        return styleIds.map((styleId) => {
            const style = stylesById[styleId];
            if (!style) {
                return '';
            }

            const rules = Array.isArray(style.rules) ? style.rules : [];
            return rules.map((rule) => {
                const selector = String(rule.selector || '').trim();
                const declarations = rule.declarations && typeof rule.declarations === 'object'
                    ? rule.declarations
                    : {};
                if (!selector) {
                    return '';
                }
                const body = Object.entries(declarations)
                    .map((entry) => `${this.toKebab(String(entry[0]))}: ${String(entry[1])};`)
                    .join(' ');
                return `${selector} { ${body} }`;
            }).join('\n');
        }).join('\n');
    }

    /**
     * Build runtime script for included script resources.
     * @param {any} state - Store snapshot.
     * @param {any} page - Page object.
     * @returns {string} Runtime JavaScript source.
     */
    buildRuntimeScript(state, page) {
        const payload = this.buildScriptPayload(state, page);
        if (payload.length === 0) {
            return '';
        }

        const serialized = this.serializeForInlineScript(payload);
        return `(() => {
    const scripts = ${serialized};
    if (!Array.isArray(scripts) || scripts.length === 0) {
        return;
    }

    const scriptById = Object.create(null);
    scripts.forEach((script) => {
        if (script && typeof script.id === 'string' && script.id) {
            scriptById[script.id] = script;
        }
    });

    const globals = window.__virtualSiteGlobals || (window.__virtualSiteGlobals = Object.create(null));
    const actionCache = new Map();

    function compileAction(scriptId, actionName, source) {
        const cacheKey = scriptId + ':' + actionName;
        if (actionCache.has(cacheKey)) {
            return actionCache.get(cacheKey);
        }
        try {
            const compiled = new Function('event', 'ctx', '"use strict";\\n' + source);
            actionCache.set(cacheKey, compiled);
            return compiled;
        } catch (error) {
            console.error('[VirtualSite] Failed to compile action', scriptId, actionName, error);
            return null;
        }
    }

    function executeAction(script, actionName, event) {
        const actions = script && script.actions && typeof script.actions === 'object' ? script.actions : {};
        const source = typeof actions[actionName] === 'string' ? actions[actionName] : '';
        if (!source.trim()) {
            return;
        }

        const compiled = compileAction(String(script.id || ''), actionName, source);
        if (!compiled) {
            return;
        }

        const variables = script && script.variables && typeof script.variables === 'object'
            ? script.variables
            : {};

        const ctx = {
            scriptId: String(script.id || ''),
            action: String(actionName || ''),
            script,
            variables,
            globals,
            scripts: scriptById,
            query(selector, root) {
                const scope = root instanceof Element ? root : document;
                return scope.querySelector(String(selector || ''));
            },
            queryAll(selector, root) {
                const scope = root instanceof Element ? root : document;
                return Array.from(scope.querySelectorAll(String(selector || '')));
            },
            emit(name, detail) {
                document.dispatchEvent(new CustomEvent(String(name || ''), { detail }));
            },
        };

        try {
            compiled(event, ctx);
        } catch (error) {
            console.error('[VirtualSite] Action runtime error', script.id, actionName, error);
        }
    }

    function addBinding(script, eventType, binding) {
        if (!binding || typeof binding !== 'object') {
            return;
        }
        const selector = String(binding.selector || '').trim();
        const action = String(binding.action || '').trim();
        if (!selector || !action) {
            return;
        }

        const attrs = binding.attrs && typeof binding.attrs === 'object' ? binding.attrs : {};
        const options = {
            capture: Boolean(attrs.capture),
            once: Boolean(attrs.once),
            passive: Boolean(attrs.passive),
        };
        const useOptions = options.capture || options.once || options.passive;
        const nodes = document.querySelectorAll(selector);

        nodes.forEach((node) => {
            node.addEventListener(
                eventType,
                (event) => executeAction(script, action, event),
                useOptions ? options : false,
            );
        });
    }

    function bootstrap() {
        scripts.forEach((script) => {
            const events = script && script.events && typeof script.events === 'object' ? script.events : {};
            Object.entries(events).forEach((entry) => {
                const eventType = String(entry[0] || '').trim();
                const bindings = Array.isArray(entry[1]) ? entry[1] : [];
                if (!eventType) {
                    return;
                }
                bindings.forEach((binding) => addBinding(script, eventType, binding));
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    } else {
        bootstrap();
    }
})();`;
    }

    /**
     * Build script runtime payload from included script ids.
     * @param {any} state - Store snapshot.
     * @param {any} page - Page object.
     * @returns {Array<{ id: string, name: string, variables: Record<string, any>, actions: Record<string, string>, events: Record<string, Array<any>> }>} Script payload.
     */
    buildScriptPayload(state, page) {
        const scriptIds = Array.isArray(page?.includes?.scriptIds) ? page.includes.scriptIds : [];
        const scriptsById = state?.resources?.scripts?.byId || {};
        /** @type {Array<{ id: string, name: string, variables: Record<string, any>, actions: Record<string, string>, events: Record<string, Array<any>> }>} */
        const payload = [];

        scriptIds.forEach((scriptId) => {
            const id = String(scriptId || '').trim();
            if (!id) {
                return;
            }
            const script = scriptsById[id];
            if (!script || typeof script !== 'object') {
                return;
            }
            payload.push({
                id,
                name: String(script.name || id),
                variables: script.variables && typeof script.variables === 'object' ? deepClone(script.variables) : {},
                actions: script.actions && typeof script.actions === 'object' ? deepClone(script.actions) : {},
                events: script.events && typeof script.events === 'object' ? deepClone(script.events) : {},
            });
        });

        return payload;
    }

    /**
     * Safely serialize JSON for inline script embedding.
     * @param {unknown} value - Serializable value.
     * @returns {string} Escaped JSON text safe for inline script tag.
     */
    serializeForInlineScript(value) {
        return JSON.stringify(value)
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026');
    }

    /**
     * Build editor-only overlay css for selection and drop affordances.
     * @returns {string} Editor overlay css text.
     */
    buildEditorOverlayCss() {
        return `
[data-vs-node-id] {
    position: relative;
}

[data-vs-node-id].vsb-node-selected {
    outline: 2px solid #4f7cff !important;
    outline-offset: 1px;
    box-shadow: inset 0 0 0 2px #4f7cff !important;
}

[data-vs-node-id].vsb-node-selected-l0 { outline-color: #ff4d4d !important; box-shadow: inset 0 0 0 2px #ff4d4d !important; }
[data-vs-node-id].vsb-node-selected-l1 { outline-color: #ff8a3d !important; box-shadow: inset 0 0 0 2px #ff8a3d !important; }
[data-vs-node-id].vsb-node-selected-l2 { outline-color: #ffd93d !important; box-shadow: inset 0 0 0 2px #ffd93d !important; }
[data-vs-node-id].vsb-node-selected-l3 { outline-color: #9be33d !important; box-shadow: inset 0 0 0 2px #9be33d !important; }
[data-vs-node-id].vsb-node-selected-l4 { outline-color: #35d07f !important; box-shadow: inset 0 0 0 2px #35d07f !important; }
[data-vs-node-id].vsb-node-selected-l5 { outline-color: #24c8d7 !important; box-shadow: inset 0 0 0 2px #24c8d7 !important; }
[data-vs-node-id].vsb-node-selected-l6 { outline-color: #3b9cff !important; box-shadow: inset 0 0 0 2px #3b9cff !important; }
[data-vs-node-id].vsb-node-selected-l7 { outline-color: #5667ff !important; box-shadow: inset 0 0 0 2px #5667ff !important; }
[data-vs-node-id].vsb-node-selected-l8 { outline-color: #8e4cff !important; box-shadow: inset 0 0 0 2px #8e4cff !important; }
[data-vs-node-id].vsb-node-selected-l9 { outline-color: #c549ff !important; box-shadow: inset 0 0 0 2px #c549ff !important; }
[data-vs-node-id].vsb-node-selected-l10 { outline-color: #ff4fc3 !important; box-shadow: inset 0 0 0 2px #ff4fc3 !important; }
[data-vs-node-id].vsb-node-selected-l11 { outline-color: #ff4f8c !important; box-shadow: inset 0 0 0 2px #ff4f8c !important; }

[data-vs-node-id].vsb-node-drop-target {
    outline: 2px dashed #37c97b !important;
    outline-offset: 1px;
}

body.vsb-tool-mode-select,
body.vsb-tool-mode-select * {
    cursor: default;
}

body.vsb-tool-mode-add,
body.vsb-tool-mode-add * {
    cursor: copy;
}

body.vsb-tool-mode-delete,
body.vsb-tool-mode-delete * {
    cursor: not-allowed;
}
`;
    }

    /**
     * Build page body from node graph.
     * @param {any} page - Page object.
     * @returns {string} HTML body content.
     */
    buildBody(page) {
        const nodeById = page?.nodeById && typeof page.nodeById === 'object' ? page.nodeById : {};
        const rootNodeIds = Array.isArray(page.rootNodeIds) ? page.rootNodeIds : [];
        const selectedNodeIds = Array.isArray(page.activeNodeIds)
            ? page.activeNodeIds
            : (typeof page.activeNodeId === 'string' && page.activeNodeId ? [page.activeNodeId] : []);
        const selected = new Set(selectedNodeIds.map((id) => String(id)));

        return rootNodeIds.map((nodeId) => this.buildNode(nodeId, nodeById, selected)).join('');
    }

    /**
     * Build html string for node and children.
     * @param {string} nodeId - Node id.
     * @param {Record<string, any>} nodeById - Node map.
     * @param {Set<string>} selectedNodeSet - Currently selected node id set.
     * @returns {string} Node html.
     */
    buildNode(nodeId, nodeById, selectedNodeSet) {
        const node = nodeById[nodeId];
        if (!node) {
            return '';
        }

        const tag = this.safeTag(node.tag);
        const attrs = this.buildAttrs(node.attrs);
        const text = typeof node.text === 'string' ? this.escapeHtml(node.text) : '';
        const children = Array.isArray(node.children)
            ? node.children.map((childId) => this.buildNode(String(childId), nodeById, selectedNodeSet)).join('')
            : '';
        const depth = this.resolveNodeDepth(nodeById, nodeId);
        const classTokens = [];
        if (attrs.className) {
            classTokens.push(attrs.className);
        }
        if (selectedNodeSet.has(String(nodeId))) {
            classTokens.push('vsb-node-selected');
            classTokens.push(`vsb-node-selected-l${depth % 12}`);
        }
        const classAttr = classTokens.length > 0
            ? ` class="${this.escapeHtml(classTokens.join(' '))}"`
            : '';

        return `<${tag}${attrs.attrText}${classAttr} data-vs-node-id="${this.escapeHtml(nodeId)}">${text}${children}</${tag}>`;
    }

    /**
     * Build html attributes string from object.
     * @param {Record<string, any> | null | undefined} attrs - Node attrs.
     * @returns {{ attrText: string, className: string }} Attribute string + class value.
     */
    buildAttrs(attrs) {
        if (!attrs || typeof attrs !== 'object') {
            return { attrText: '', className: '' };
        }

        const className = String(attrs.class || '').trim();
        const attrText = Object.entries(attrs).map((entry) => {
            const key = String(entry[0] || '').trim();
            const value = String(entry[1] ?? '').trim();
            if (!key || key.startsWith('_') || key === 'class') {
                return '';
            }
            return ` ${this.escapeHtml(key)}="${this.escapeHtml(value)}"`;
        }).join('');
        return { attrText, className };
    }

    /**
     * Resolve node depth from root for color cycling.
     * @param {Record<string, any>} nodeById - Node map.
     * @param {string} nodeId - Node id.
     * @returns {number} Depth index (0-based).
     */
    resolveNodeDepth(nodeById, nodeId) {
        let depth = 0;
        let currentId = String(nodeId || '');
        const visited = new Set();
        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const node = nodeById[currentId];
            if (!node || typeof node.parent !== 'string' || !node.parent || !nodeById[node.parent]) {
                break;
            }
            depth += 1;
            currentId = node.parent;
        }
        return depth;
    }

    /**
     * Bind editor interaction handlers into the rendered iframe document.
     * @param {string | null} pageId - Active page id.
     * @returns {void}
     */
    bindEditorInteractions(pageId) {
        if (!pageId || !this.frame?.contentDocument) {
            return;
        }

        const doc = this.frame.contentDocument;
        const body = doc.body;
        if (!body) {
            return;
        }

        const toolState = this.resolveToolState();
        body.classList.remove('vsb-tool-mode-select', 'vsb-tool-mode-add', 'vsb-tool-mode-delete');
        body.classList.add(`vsb-tool-mode-${toolState.mode}`);
        doc.querySelectorAll('[data-vs-node-id]').forEach((node) => {
            const element = /** @type {HTMLElement} */ (node);
            element.draggable = toolState.mode === 'select';
        });

        body.addEventListener('click', (event) => {
            const tool = this.resolveToolState();
            const nodeElement = this.closestNodeElement(event.target);
            const nodeId = nodeElement?.getAttribute('data-vs-node-id') || null;
            const clickEvent = /** @type {MouseEvent} */ (event);

            if (tool.mode === 'select') {
                event.preventDefault();
                event.stopPropagation();
                if (nodeElement) {
                    const ancestry = this.extractNodeAncestryIds(nodeElement);
                    if (clickEvent.shiftKey && ancestry.length > 0) {
                        this.emitInteraction({
                            type: 'select-overlap',
                            pageId,
                            nodeIds: ancestry,
                        });
                        return;
                    }

                    const nextNodeId = this.resolveCycledSelectionNodeId(ancestry);
                    if (nextNodeId) {
                        this.emitInteraction({
                            type: 'select',
                            pageId,
                            nodeId: nextNodeId,
                            ctrlKey: Boolean(clickEvent.ctrlKey || clickEvent.metaKey),
                        });
                        return;
                    }
                }

                if (nodeId) {
                    this.emitInteraction({
                        type: 'select',
                        pageId,
                        nodeId,
                        ctrlKey: Boolean(clickEvent.ctrlKey || clickEvent.metaKey),
                    });
                } else {
                    this.selectionCycle = { key: '', index: -1 };
                    this.emitInteraction({ type: 'clear-selection', pageId });
                }
                return;
            }

            if (tool.mode === 'add') {
                event.preventDefault();
                event.stopPropagation();
                this.emitInteraction({
                    type: 'add',
                    pageId,
                    nodeId,
                    clientX: Number.isFinite(clickEvent.clientX) ? clickEvent.clientX : undefined,
                    clientY: Number.isFinite(clickEvent.clientY) ? clickEvent.clientY : undefined,
                });
                return;
            }

            if (tool.mode === 'delete' && nodeId) {
                event.preventDefault();
                event.stopPropagation();
                this.emitInteraction({
                    type: 'delete',
                    pageId,
                    nodeId,
                });
            }
        }, true);

        doc.addEventListener('keydown', (event) => {
            if (!this.canHandleKeyEvent(event)) {
                return;
            }
            const key = String(event.key || '').toLowerCase();
            if (event.shiftKey && key === 'w') {
                event.preventDefault();
                this.emitInteraction({ type: 'set-tool-select', pageId });
                return;
            }
            if (event.shiftKey && key === 'a') {
                event.preventDefault();
                this.emitInteraction({ type: 'set-tool-add', pageId });
                return;
            }
            if (event.shiftKey && key === 'd') {
                event.preventDefault();
                if (this.resolveToolState().mode === 'delete') {
                    this.emitInteraction({ type: 'toggle-delete-mode', pageId });
                } else {
                    this.emitInteraction({ type: 'set-tool-delete', pageId });
                }
                return;
            }
            if (!event.shiftKey && key === 'd' && this.resolveToolState().mode === 'delete') {
                event.preventDefault();
                this.emitInteraction({ type: 'toggle-delete-mode', pageId });
            }
        });

        body.addEventListener('dragstart', (event) => {
            const tool = this.resolveToolState();
            if (tool.mode !== 'select') {
                return;
            }
            const nodeElement = this.closestNodeElement(event.target);
            const nodeId = nodeElement?.getAttribute('data-vs-node-id') || null;
            if (!nodeId) {
                return;
            }
            this.dragSourceNodeId = nodeId;
            if (event.dataTransfer) {
                event.dataTransfer.setData('text/plain', nodeId);
                event.dataTransfer.effectAllowed = 'move';
            }
        });

        body.addEventListener('dragover', (event) => {
            const tool = this.resolveToolState();
            if (tool.mode !== 'select') {
                return;
            }
            const nodeElement = this.closestNodeElement(event.target);
            const targetNodeId = nodeElement?.getAttribute('data-vs-node-id') || '';
            if (!targetNodeId) {
                return;
            }
            const sourceNodeId = this.dragSourceNodeId
                || event.dataTransfer?.getData('text/plain')
                || null;
            const canDrop = this.canDrop
                ? this.canDrop({ pageId, targetNodeId, sourceNodeId })
                : false;
            if (!canDrop) {
                return;
            }
            event.preventDefault();
            if (this.activeDropTargetNode !== nodeElement) {
                this.clearDropTargetClass();
                this.activeDropTargetNode = nodeElement;
                this.activeDropTargetNode.classList.add('vsb-node-drop-target');
            }
        });

        body.addEventListener('dragleave', (event) => {
            const nodeElement = this.closestNodeElement(event.target);
            if (!nodeElement || nodeElement !== this.activeDropTargetNode) {
                return;
            }
            const relatedTarget = /** @type {Element | null} */ ((/** @type {DragEvent} */ (event)).relatedTarget);
            if (!relatedTarget || !nodeElement.contains(relatedTarget)) {
                this.clearDropTargetClass();
            }
        });

        body.addEventListener('drop', (event) => {
            const tool = this.resolveToolState();
            if (tool.mode !== 'select') {
                this.clearDropTargetClass();
                return;
            }
            const nodeElement = this.closestNodeElement(event.target);
            const targetNodeId = nodeElement?.getAttribute('data-vs-node-id') || '';
            const sourceNodeId = this.dragSourceNodeId
                || event.dataTransfer?.getData('text/plain')
                || null;
            const canDrop = targetNodeId && this.canDrop
                ? this.canDrop({ pageId, targetNodeId, sourceNodeId })
                : false;
            if (canDrop) {
                event.preventDefault();
                this.emitInteraction({
                    type: 'drop',
                    pageId,
                    targetNodeId,
                    sourceNodeId,
                });
            }
            this.clearDropTargetClass();
            this.dragSourceNodeId = null;
        });

        body.addEventListener('dragend', () => {
            this.clearDropTargetClass();
            this.dragSourceNodeId = null;
        });
    }

    /**
     * Resolve current tool state.
     * @returns {{ mode: string, deleteMode: string }} Tool state.
     */
    resolveToolState() {
        if (!this.getToolState) {
            return { mode: 'select', deleteMode: 'single' };
        }
        const state = this.getToolState();
        return {
            mode: String(state?.mode || 'select'),
            deleteMode: String(state?.deleteMode || 'single'),
        };
    }

    /**
     * Guard iframe keyboard shortcut handling while typing.
     * @param {KeyboardEvent} event - Keyboard event.
     * @returns {boolean} True when editor shortcuts should execute.
     */
    canHandleKeyEvent(event) {
        const target = event.target;
        if (!(target instanceof Element)) {
            return true;
        }
        if (target.closest('input, textarea, select, [contenteditable="true"]')) {
            return false;
        }
        return true;
    }

    /**
     * Find the closest annotated node element from event target.
     * @param {EventTarget | null} target - Raw event target.
     * @returns {HTMLElement | null} Node element when found.
     */
    closestNodeElement(target) {
        if (!(target instanceof Node)) {
            return null;
        }
        const start = target instanceof Element ? target : target.parentElement;
        if (!(start instanceof Element)) {
            return null;
        }
        const node = start.closest('[data-vs-node-id]');
        return node instanceof HTMLElement ? node : null;
    }

    /**
     * Build ordered overlap ancestry from outermost to innermost node.
     * @param {HTMLElement} element - Innermost clicked node element.
     * @returns {string[]} Node ids from outermost to innermost.
     */
    extractNodeAncestryIds(element) {
        /** @type {string[]} */
        const chain = [];
        let current = element;
        while (current) {
            const id = current.getAttribute('data-vs-node-id');
            if (id) {
                chain.push(String(id));
            }
            const parent = current.parentElement;
            if (!parent) {
                break;
            }
            const parentNode = parent.closest('[data-vs-node-id]');
            if (!(parentNode instanceof HTMLElement) || parentNode === current) {
                break;
            }
            current = parentNode;
        }
        return chain.reverse();
    }

    /**
     * Resolve overlap-cycled node id for select clicks.
     * @param {string[]} ancestry - Overlap node ids from outermost to innermost.
     * @returns {string | null} Next node id in cycle.
     */
    resolveCycledSelectionNodeId(ancestry) {
        if (!Array.isArray(ancestry) || ancestry.length === 0) {
            this.selectionCycle = { key: '', index: -1 };
            return null;
        }
        const key = ancestry.join('>');
        if (this.selectionCycle.key !== key) {
            this.selectionCycle = { key, index: 0 };
        } else {
            this.selectionCycle.index = (this.selectionCycle.index + 1) % ancestry.length;
        }
        return ancestry[this.selectionCycle.index] || null;
    }

    /**
     * Emit normalized interaction payload to the host builder.
     * @param {{
     *   type: 'select' | 'select-overlap' | 'clear-selection' | 'add' | 'delete' | 'drop' | 'set-tool-select' | 'set-tool-add' | 'set-tool-delete' | 'toggle-delete-mode',
     *   pageId: string,
     *   nodeId?: string | null,
     *   nodeIds?: string[] | null,
     *   targetNodeId?: string | null,
     *   sourceNodeId?: string | null,
     *   ctrlKey?: boolean,
     *   clientX?: number,
     *   clientY?: number
     * }} payload - Interaction payload.
     * @returns {void}
     */
    emitInteraction(payload) {
        if (!this.onInteraction) {
            return;
        }
        this.onInteraction(payload);
    }

    /**
     * Clear active drop target visuals.
     * @returns {void}
     */
    clearDropTargetClass() {
        if (this.activeDropTargetNode) {
            this.activeDropTargetNode.classList.remove('vsb-node-drop-target');
        }
        this.activeDropTargetNode = null;
    }

    /**
     * Normalize input tag name.
     * @param {unknown} tagName - Input tag.
     * @returns {string} Safe tag.
     */
    safeTag(tagName) {
        const value = String(tagName || '').trim().toLowerCase();
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
            return 'div';
        }
        return value;
    }

    /**
     * Convert camelCase property name to kebab-case.
     * @param {string} input - Property key.
     * @returns {string} Kebab-case property.
     */
    toKebab(input) {
        return input.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
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
