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

        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>${css}</style>
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
     * Build page body from node graph.
     * @param {any} page - Page object.
     * @returns {string} HTML body content.
     */
    buildBody(page) {
        const nodeById = page?.nodeById && typeof page.nodeById === 'object' ? page.nodeById : {};
        const rootNodeIds = Array.isArray(page.rootNodeIds) ? page.rootNodeIds : [];
        return rootNodeIds.map((nodeId) => this.buildNode(nodeId, nodeById, new Set())).join('');
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
        const classTokens = [];
        if (attrs.className) {
            classTokens.push(attrs.className);
        }
        const classAttr = classTokens.length > 0
            ? ` class="${this.escapeHtml(classTokens.join(' '))}"`
            : '';

        return `<${tag}${attrs.attrText}${classAttr}>${text}${children}</${tag}>`;
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
