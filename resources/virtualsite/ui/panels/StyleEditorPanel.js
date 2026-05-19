import { deepClone } from '../../core/DeepClone.js';

/**
 * Structured + raw style resource editor.
 */
export class StyleEditorPanel {
    /**
     * Create style editor panel.
     * @param {{
     *   getState: () => object,
     *   onUpdateStyle: (styleId: string, nextStyle: any) => void
     * }} options - Panel options.
     */
    constructor(options) {
        /** @type {() => object} */
        this.getState = options.getState;
        /** @type {(styleId: string, nextStyle: any) => void} */
        this.onUpdateStyle = options.onUpdateStyle;
        /** @type {HTMLElement | null} */
        this.root = null;
        /** @type {string | null} */
        this.styleId = null;
        /** @type {boolean} */
        this.rawMode = false;
    }

    /**
     * Mount editor panel.
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
     * Set current style id.
     * @param {string | null} styleId - Style id.
     * @returns {void}
     */
    setStyleId(styleId) {
        this.styleId = styleId ? String(styleId) : null;
        this.render();
    }

    /**
     * Render panel.
     * @returns {void}
     */
    render() {
        if (!this.root) {
            return;
        }

        const style = this.getActiveStyle();
        if (!style) {
            this.root.innerHTML = '<div class="vsb-inline-help">Style not found.</div>';
            return;
        }

        this.root.innerHTML = `
            <div class="vsb-editor-toolbar">
                <strong>Style: ${this.escapeHtml(style.name || style.id)}</strong>
                <button type="button" class="vsb-btn" data-role="toggle-mode">${this.rawMode ? 'Structured Mode' : 'Raw CSS Mode'}</button>
                ${this.rawMode ? '<button type="button" class="vsb-btn vsb-btn-primary" data-role="apply-raw">Apply CSS</button>' : '<button type="button" class="vsb-btn vsb-btn-primary" data-role="add-selector">Add Selector</button>'}
            </div>
            ${this.rawMode ? this.renderRawBody(style) : this.renderStructuredBody(style)}
        `;

        this.bindEvents(style);
    }

    /**
     * Render raw mode markup.
     * @param {any} style - Style object.
     * @returns {string} HTML content.
     */
    renderRawBody(style) {
        const cssText = this.rulesToCss(style.rules || []);
        return `
            <textarea class="vsb-textarea" data-role="raw-css">${this.escapeHtml(cssText)}</textarea>
        `;
    }

    /**
     * Render structured mode markup.
     * @param {any} style - Style object.
     * @returns {string} HTML content.
     */
    renderStructuredBody(style) {
        const rules = Array.isArray(style.rules) ? style.rules : [];
        const cards = rules.map((rule, ruleIndex) => {
            const selector = String(rule.selector || '');
            const declarations = rule.declarations && typeof rule.declarations === 'object'
                ? rule.declarations
                : {};
            const declarationRows = Object.entries(declarations).map((entry, declarationIndex) => `
                <div class="vsb-grid-two">
                    <input class="vsb-input" data-role="decl-prop" data-rule-index="${ruleIndex}" data-decl-index="${declarationIndex}" value="${this.escapeHtml(String(entry[0]))}" placeholder="property" />
                    <input class="vsb-input" data-role="decl-val" data-rule-index="${ruleIndex}" data-decl-index="${declarationIndex}" value="${this.escapeHtml(String(entry[1]))}" placeholder="value" />
                </div>
            `).join('');

            return `
                <article class="vsb-card">
                    <div class="vsb-grid-two">
                        <input class="vsb-input" data-role="selector" data-rule-index="${ruleIndex}" value="${this.escapeHtml(selector)}" placeholder="selector" />
                        <button type="button" class="vsb-btn is-danger" data-role="remove-selector" data-rule-index="${ruleIndex}">Remove</button>
                    </div>
                    <div class="vsb-small">Declarations</div>
                    <div>${declarationRows || '<div class="vsb-small">No declarations.</div>'}</div>
                    <div class="vsb-theme-actions">
                        <button type="button" class="vsb-btn" data-role="add-decl" data-rule-index="${ruleIndex}">Add Declaration</button>
                    </div>
                </article>
            `;
        }).join('');

        return `
            <div class="vsb-split-right">
                ${cards || '<div class="vsb-inline-help">No selectors yet.</div>'}
            </div>
        `;
    }

    /**
     * Bind panel events.
     * @param {any} style - Current style object.
     * @returns {void}
     */
    bindEvents(style) {
        if (!this.root || !this.styleId) {
            return;
        }

        this.root.querySelector('[data-role="toggle-mode"]')?.addEventListener('click', () => {
            this.rawMode = !this.rawMode;
            this.render();
        });

        if (this.rawMode) {
            this.root.querySelector('[data-role="apply-raw"]')?.addEventListener('click', () => {
                const textarea = /** @type {HTMLTextAreaElement | null} */ (this.root?.querySelector('[data-role="raw-css"]'));
                const raw = textarea ? textarea.value : '';
                const nextStyle = deepClone(style);
                nextStyle.rules = this.cssToRules(raw);
                this.onUpdateStyle(this.styleId, nextStyle);
            });
            return;
        }

        this.root.querySelector('[data-role="add-selector"]')?.addEventListener('click', () => {
            const nextStyle = deepClone(style);
            nextStyle.rules = Array.isArray(nextStyle.rules) ? nextStyle.rules : [];
            nextStyle.rules.push({ selector: '.new-selector', declarations: {} });
            this.onUpdateStyle(this.styleId, nextStyle);
        });

        this.root.querySelectorAll('[data-role="remove-selector"]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const ruleIndex = Number.parseInt(button.dataset.ruleIndex || '-1', 10);
                const nextStyle = deepClone(style);
                if (!Array.isArray(nextStyle.rules) || ruleIndex < 0 || ruleIndex >= nextStyle.rules.length) {
                    return;
                }
                nextStyle.rules.splice(ruleIndex, 1);
                this.onUpdateStyle(this.styleId, nextStyle);
            });
        });

        this.root.querySelectorAll('[data-role="add-decl"]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const ruleIndex = Number.parseInt(button.dataset.ruleIndex || '-1', 10);
                const nextStyle = deepClone(style);
                if (!Array.isArray(nextStyle.rules) || ruleIndex < 0 || ruleIndex >= nextStyle.rules.length) {
                    return;
                }
                const rule = nextStyle.rules[ruleIndex] || { selector: '.selector', declarations: {} };
                rule.declarations ||= {};
                rule.declarations['property'] = 'value';
                nextStyle.rules[ruleIndex] = rule;
                this.onUpdateStyle(this.styleId, nextStyle);
            });
        });

        this.root.querySelectorAll('[data-role="selector"]').forEach((node) => {
            const input = /** @type {HTMLInputElement} */ (node);
            input.addEventListener('change', () => {
                const ruleIndex = Number.parseInt(input.dataset.ruleIndex || '-1', 10);
                const nextStyle = deepClone(style);
                if (!Array.isArray(nextStyle.rules) || ruleIndex < 0 || ruleIndex >= nextStyle.rules.length) {
                    return;
                }
                nextStyle.rules[ruleIndex].selector = input.value;
                this.onUpdateStyle(this.styleId, nextStyle);
            });
        });

        const props = Array.from(this.root.querySelectorAll('[data-role="decl-prop"]'));
        const vals = Array.from(this.root.querySelectorAll('[data-role="decl-val"]'));
        props.concat(vals).forEach((node) => {
            const input = /** @type {HTMLInputElement} */ (node);
            input.addEventListener('change', () => {
                const ruleIndex = Number.parseInt(input.dataset.ruleIndex || '-1', 10);
                const declIndex = Number.parseInt(input.dataset.declIndex || '-1', 10);
                const nextStyle = deepClone(style);
                if (!Array.isArray(nextStyle.rules) || ruleIndex < 0 || ruleIndex >= nextStyle.rules.length) {
                    return;
                }
                const rule = nextStyle.rules[ruleIndex];
                const entries = Object.entries(rule.declarations || {});
                if (declIndex < 0 || declIndex >= entries.length) {
                    return;
                }
                const current = entries[declIndex];
                const nextProp = input.dataset.role === 'decl-prop' ? input.value : current[0];
                const nextVal = input.dataset.role === 'decl-val' ? input.value : current[1];
                entries[declIndex] = [nextProp, nextVal];
                rule.declarations = Object.fromEntries(entries.filter((entry) => String(entry[0]).trim() !== ''));
                this.onUpdateStyle(this.styleId, nextStyle);
            });
        });
    }

    /**
     * Resolve active style object.
     * @returns {any | null} Active style object.
     */
    getActiveStyle() {
        if (!this.styleId) {
            return null;
        }
        const state = this.getState();
        return state?.resources?.styles?.byId?.[this.styleId] || null;
    }

    /**
     * Convert rules into CSS text.
     * @param {Array<{ selector: string, declarations: Record<string, string> }>} rules - Rule list.
     * @returns {string} CSS text.
     */
    rulesToCss(rules) {
        return (rules || []).map((rule) => {
            const selector = String(rule.selector || '').trim();
            if (!selector) {
                return '';
            }
            const declarations = rule.declarations && typeof rule.declarations === 'object'
                ? rule.declarations
                : {};
            const body = Object.entries(declarations)
                .map((entry) => `${String(entry[0])}: ${String(entry[1])};`)
                .join('\n  ');
            return `${selector} {\n  ${body}\n}`;
        }).filter(Boolean).join('\n\n');
    }

    /**
     * Parse CSS text to rule array.
     * @param {string} cssText - CSS text.
     * @returns {Array<{ selector: string, declarations: Record<string, string> }>} Rule list.
     */
    cssToRules(cssText) {
        const input = String(cssText || '');
        const blocks = input.split('}');
        /** @type {Array<{ selector: string, declarations: Record<string, string> }>} */
        const rules = [];
        blocks.forEach((block) => {
            const parts = block.split('{');
            if (parts.length < 2) {
                return;
            }
            const selector = String(parts[0] || '').trim();
            const body = String(parts.slice(1).join('{') || '').trim();
            if (!selector || !body) {
                return;
            }
            /** @type {Record<string, string>} */
            const declarations = {};
            body.split(';').forEach((line) => {
                const pair = line.split(':');
                if (pair.length < 2) {
                    return;
                }
                const property = String(pair.shift() || '').trim();
                const value = String(pair.join(':') || '').trim();
                if (!property || !value) {
                    return;
                }
                declarations[property] = value;
            });
            rules.push({ selector, declarations });
        });
        return rules;
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

