import { deepClone } from '../../core/DeepClone.js';

/**
 * Structured + raw script resource editor.
 */
export class ScriptEditorPanel {
    /**
     * Create script editor.
     * @param {{
     *   getState: () => object,
     *   onUpdateScript: (scriptId: string, nextScript: any) => void
     * }} options - Panel options.
     */
    constructor(options) {
        /** @type {() => object} */
        this.getState = options.getState;
        /** @type {(scriptId: string, nextScript: any) => void} */
        this.onUpdateScript = options.onUpdateScript;
        /** @type {HTMLElement | null} */
        this.root = null;
        /** @type {string | null} */
        this.scriptId = null;
        /** @type {boolean} */
        this.rawMode = false;
        /** @type {number} */
        this.actionPanePercent = 70;
        /** @type {(() => void) | null} */
        this.splitResizeCleanup = null;
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
     * Set target script id.
     * @param {string | null} scriptId - Script id.
     * @returns {void}
     */
    setScriptId(scriptId) {
        this.scriptId = scriptId ? String(scriptId) : null;
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
        this.splitResizeCleanup?.();
        this.splitResizeCleanup = null;

        const script = this.getActiveScript();
        if (!script) {
            this.root.innerHTML = '<div class="vsb-inline-help">Script not found.</div>';
            return;
        }

        const actionNames = Object.keys(script.actions || {});
        this.root.innerHTML = `
            <div class="vsb-editor-toolbar">
                <strong>Script: ${this.escapeHtml(script.name || script.id)}</strong>
                <button type="button" class="vsb-btn" data-role="toggle-mode">${this.rawMode ? 'Structured Mode' : 'Raw JSON Mode'}</button>
                ${this.rawMode ? '<button type="button" class="vsb-btn vsb-btn-primary" data-role="apply-raw">Apply JSON</button>' : `
                    <button type="button" class="vsb-btn vsb-btn-primary" data-role="add-action">Add Action</button>
                    <button type="button" class="vsb-btn vsb-btn-primary" data-role="add-event">Add Event Binding</button>
                `}
            </div>
            ${this.rawMode ? this.renderRawBody(script) : this.renderStructuredBody(script, actionNames)}
        `;

        this.bindEvents(script);
    }

    /**
     * Render raw mode UI.
     * @param {any} script - Script object.
     * @returns {string} HTML.
     */
    renderRawBody(script) {
        return `<textarea class="vsb-textarea" data-role="raw-json">${this.escapeHtml(JSON.stringify(script, null, 2))}</textarea>`;
    }

    /**
     * Render structured mode UI.
     * @param {any} script - Script object.
     * @param {string[]} actionNames - Action keys.
     * @returns {string} HTML.
     */
    renderStructuredBody(script, actionNames) {
        const actionCards = Object.entries(script.actions || {}).map((entry) => `
            <article class="vsb-card">
                <div class="vsb-grid-two">
                    <input class="vsb-input" data-role="action-name" data-action-name="${this.escapeHtml(String(entry[0]))}" value="${this.escapeHtml(String(entry[0]))}" />
                    <button type="button" class="vsb-btn is-danger" data-role="remove-action" data-action-name="${this.escapeHtml(String(entry[0]))}">Remove</button>
                </div>
                <textarea class="vsb-textarea" data-role="action-code" data-action-name="${this.escapeHtml(String(entry[0]))}">${this.escapeHtml(String(entry[1]))}</textarea>
            </article>
        `).join('');

        const eventRows = [];
        Object.entries(script.events || {}).forEach((entry) => {
            const eventType = String(entry[0] || '');
            const bindings = Array.isArray(entry[1]) ? entry[1] : [];
            bindings.forEach((binding, bindingIndex) => {
                const attrs = binding.attrs && typeof binding.attrs === 'object' ? binding.attrs : {};
                const actionOptions = actionNames.map((name) => `<option value="${this.escapeHtml(name)}" ${name === binding.action ? 'selected' : ''}>${this.escapeHtml(name)}</option>`).join('');
                eventRows.push(`
                    <article class="vsb-card">
                        <div class="vsb-grid-two">
                            <input class="vsb-input" data-role="event-type" data-event-type="${this.escapeHtml(eventType)}" data-binding-index="${bindingIndex}" value="${this.escapeHtml(eventType)}" />
                            <button type="button" class="vsb-btn is-danger" data-role="remove-event" data-event-type="${this.escapeHtml(eventType)}" data-binding-index="${bindingIndex}">Remove</button>
                        </div>
                        <input class="vsb-input" data-role="event-selector" data-event-type="${this.escapeHtml(eventType)}" data-binding-index="${bindingIndex}" value="${this.escapeHtml(String(binding.selector || ''))}" placeholder="selector" />
                        <select class="vsb-input" data-role="event-action" data-event-type="${this.escapeHtml(eventType)}" data-binding-index="${bindingIndex}">
                            ${actionOptions}
                        </select>
                        <div class="vsb-theme-actions">
                            <label class="vsb-script-flag">
                                <input class="vsb-checkbox" type="checkbox" data-role="attr-capture" data-event-type="${this.escapeHtml(eventType)}" data-binding-index="${bindingIndex}" ${attrs.capture ? 'checked' : ''}/>
                                <span class="vsb-checkbox-ui" aria-hidden="true"></span>
                                <span>capture</span>
                            </label>
                            <label class="vsb-script-flag">
                                <input class="vsb-checkbox" type="checkbox" data-role="attr-once" data-event-type="${this.escapeHtml(eventType)}" data-binding-index="${bindingIndex}" ${attrs.once ? 'checked' : ''}/>
                                <span class="vsb-checkbox-ui" aria-hidden="true"></span>
                                <span>once</span>
                            </label>
                            <label class="vsb-script-flag">
                                <input class="vsb-checkbox" type="checkbox" data-role="attr-passive" data-event-type="${this.escapeHtml(eventType)}" data-binding-index="${bindingIndex}" ${attrs.passive ? 'checked' : ''}/>
                                <span class="vsb-checkbox-ui" aria-hidden="true"></span>
                                <span>passive</span>
                            </label>
                        </div>
                    </article>
                `);
            });
        });

        return `
            <div class="vsb-script-split" data-role="script-split" style="--vsb-script-action-width:${this.clampActionPanePercent(this.actionPanePercent)}%;">
                <section class="vsb-script-pane vsb-script-pane-actions">
                    <h4>Actions</h4>
                    ${actionCards || '<div class="vsb-small">No actions.</div>'}
                </section>
                <div class="vsb-script-split-resizer" data-role="script-split-resizer" role="separator" aria-orientation="vertical" aria-label="Resize actions and events"></div>
                <section class="vsb-script-pane vsb-script-pane-events">
                    <h4>Events</h4>
                    ${eventRows.join('') || '<div class="vsb-small">No event bindings.</div>'}
                </section>
            </div>
        `;
    }

    /**
     * Bind editor events.
     * @param {any} script - Current script object.
     * @returns {void}
     */
    bindEvents(script) {
        if (!this.root || !this.scriptId) {
            return;
        }

        this.root.querySelector('[data-role="toggle-mode"]')?.addEventListener('click', () => {
            this.rawMode = !this.rawMode;
            this.render();
        });

        if (this.rawMode) {
            this.root.querySelector('[data-role="apply-raw"]')?.addEventListener('click', () => {
                const textarea = /** @type {HTMLTextAreaElement | null} */ (this.root?.querySelector('[data-role="raw-json"]'));
                if (!textarea) {
                    return;
                }
                try {
                    const parsed = JSON.parse(textarea.value);
                    this.onUpdateScript(this.scriptId, parsed);
                } catch (_) {
                    // Keep invalid json in textarea and ignore apply.
                }
            });
            return;
        }

        this.root.querySelector('[data-role="add-action"]')?.addEventListener('click', () => {
            const next = deepClone(script);
            next.actions ||= {};
            const name = this.createUniqueKey(Object.keys(next.actions), 'newAction');
            next.actions[name] = '// action code';
            this.onUpdateScript(this.scriptId, next);
        });

        this.root.querySelector('[data-role="add-event"]')?.addEventListener('click', () => {
            const next = deepClone(script);
            next.events ||= {};
            next.events.click ||= [];
            next.events.click.push({
                selector: 'body',
                action: Object.keys(next.actions || {})[0] || '',
                attrs: { capture: false, once: false, passive: false },
            });
            this.onUpdateScript(this.scriptId, next);
        });

        this.root.querySelectorAll('[data-role="remove-action"]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const actionName = button.dataset.actionName || '';
                const next = deepClone(script);
                delete next.actions?.[actionName];
                Object.keys(next.events || {}).forEach((eventType) => {
                    next.events[eventType] = (next.events[eventType] || []).filter((binding) => binding.action !== actionName);
                });
                this.onUpdateScript(this.scriptId, next);
            });
        });

        this.root.querySelectorAll('[data-role="action-code"]').forEach((node) => {
            const textarea = /** @type {HTMLTextAreaElement} */ (node);
            textarea.addEventListener('change', () => {
                const actionName = textarea.dataset.actionName || '';
                const next = deepClone(script);
                next.actions ||= {};
                next.actions[actionName] = textarea.value;
                this.onUpdateScript(this.scriptId, next);
            });
        });

        this.root.querySelectorAll('[data-role="action-name"]').forEach((node) => {
            const input = /** @type {HTMLInputElement} */ (node);
            input.addEventListener('change', () => {
                const previousName = input.dataset.actionName || '';
                const proposedName = String(input.value || '').trim();
                if (!previousName || !proposedName) {
                    return;
                }
                const next = deepClone(script);
                next.actions ||= {};
                if (previousName === proposedName) {
                    return;
                }
                const sourceCode = next.actions[previousName];
                delete next.actions[previousName];
                next.actions[proposedName] = sourceCode;
                Object.keys(next.events || {}).forEach((eventType) => {
                    (next.events[eventType] || []).forEach((binding) => {
                        if (binding.action === previousName) {
                            binding.action = proposedName;
                        }
                    });
                });
                this.onUpdateScript(this.scriptId, next);
            });
        });

        this.root.querySelectorAll('[data-role="remove-event"]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const eventType = button.dataset.eventType || '';
                const bindingIndex = Number.parseInt(button.dataset.bindingIndex || '-1', 10);
                const next = deepClone(script);
                if (!Array.isArray(next.events?.[eventType]) || bindingIndex < 0 || bindingIndex >= next.events[eventType].length) {
                    return;
                }
                next.events[eventType].splice(bindingIndex, 1);
                if (next.events[eventType].length === 0) {
                    delete next.events[eventType];
                }
                this.onUpdateScript(this.scriptId, next);
            });
        });

        this.bindEventFieldChanges(script, 'event-selector', (next, type, index, value) => {
            next.events[type][index].selector = value;
        });
        this.bindEventFieldChanges(script, 'event-action', (next, type, index, value) => {
            next.events[type][index].action = value;
        });
        this.bindEventFieldChanges(script, 'event-type', (next, type, index, value) => {
            const binding = next.events[type][index];
            next.events[type].splice(index, 1);
            if (next.events[type].length === 0) {
                delete next.events[type];
            }
            next.events[value] ||= [];
            next.events[value].push(binding);
        });

        this.bindEventCheckbox(script, 'attr-capture', 'capture');
        this.bindEventCheckbox(script, 'attr-once', 'once');
        this.bindEventCheckbox(script, 'attr-passive', 'passive');
        this.bindSplitResizer();
    }

    /**
     * Bind string field updates on event bindings.
     * @param {any} script - Source script.
     * @param {string} role - Input role.
     * @param {(next: any, type: string, index: number, value: string) => void} updater - Mutation function.
     * @returns {void}
     */
    bindEventFieldChanges(script, role, updater) {
        if (!this.root || !this.scriptId) {
            return;
        }
        this.root.querySelectorAll(`[data-role="${role}"]`).forEach((node) => {
            const input = /** @type {HTMLInputElement | HTMLSelectElement} */ (node);
            input.addEventListener('change', () => {
                const eventType = input.dataset.eventType || '';
                const bindingIndex = Number.parseInt(input.dataset.bindingIndex || '-1', 10);
                if (!eventType) {
                    return;
                }
                const next = deepClone(script);
                if (!Array.isArray(next.events?.[eventType]) || bindingIndex < 0 || bindingIndex >= next.events[eventType].length) {
                    return;
                }
                updater(next, eventType, bindingIndex, String(input.value || '').trim());
                this.onUpdateScript(this.scriptId, next);
            });
        });
    }

    /**
     * Bind checkbox attribute updates on event bindings.
     * @param {any} script - Source script.
     * @param {string} role - Checkbox role.
     * @param {string} attrKey - Attribute key.
     * @returns {void}
     */
    bindEventCheckbox(script, role, attrKey) {
        if (!this.root || !this.scriptId) {
            return;
        }
        this.root.querySelectorAll(`[data-role="${role}"]`).forEach((node) => {
            const input = /** @type {HTMLInputElement} */ (node);
            input.addEventListener('change', () => {
                const eventType = input.dataset.eventType || '';
                const bindingIndex = Number.parseInt(input.dataset.bindingIndex || '-1', 10);
                const next = deepClone(script);
                if (!Array.isArray(next.events?.[eventType]) || bindingIndex < 0 || bindingIndex >= next.events[eventType].length) {
                    return;
                }
                next.events[eventType][bindingIndex].attrs ||= {};
                next.events[eventType][bindingIndex].attrs[attrKey] = input.checked;
                this.onUpdateScript(this.scriptId, next);
            });
        });
    }

    /**
     * Clamp actions pane percentage for structured split.
     * @param {unknown} value - Candidate percentage.
     * @returns {number} Clamped percentage.
     */
    clampActionPanePercent(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return 70;
        }
        return Math.min(85, Math.max(30, numeric));
    }

    /**
     * Bind drag resize between actions and events panes.
     * @returns {void}
     */
    bindSplitResizer() {
        if (!this.root || this.rawMode) {
            return;
        }
        this.splitResizeCleanup?.();

        const split = /** @type {HTMLElement | null} */ (this.root.querySelector('[data-role="script-split"]'));
        const handle = /** @type {HTMLElement | null} */ (this.root.querySelector('[data-role="script-split-resizer"]'));
        if (!split || !handle) {
            return;
        }

        let isDragging = false;
        let activePointerId = null;
        let livePercent = this.clampActionPanePercent(this.actionPanePercent);
        handle.setAttribute('aria-valuemin', '30');
        handle.setAttribute('aria-valuemax', '85');
        handle.setAttribute('aria-valuenow', String(Math.round(livePercent * 100) / 100));

        const onPointerMove = (event) => {
            if (!isDragging || (activePointerId !== null && event.pointerId !== activePointerId)) {
                return;
            }
            event.preventDefault();
            const rect = split.getBoundingClientRect();
            const width = Math.max(rect.width, 1);
            const raw = ((event.clientX - rect.left) / width) * 100;
            livePercent = this.clampActionPanePercent(raw);
            split.style.setProperty('--vsb-script-action-width', `${livePercent}%`);
            handle.setAttribute('aria-valuenow', String(Math.round(livePercent * 100) / 100));
        };

        const stopDragging = () => {
            if (!isDragging) {
                return;
            }
            isDragging = false;
            if (activePointerId !== null) {
                try {
                    handle.releasePointerCapture(activePointerId);
                } catch {
                    // ignore release errors
                }
            }
            activePointerId = null;
            this.actionPanePercent = livePercent;
            this.root?.classList.remove('is-script-split-resizing');
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', stopDragging);
            window.removeEventListener('pointercancel', stopDragging);
        };

        const onPointerDown = (event) => {
            if (event.button !== 0) {
                return;
            }
            event.preventDefault();
            isDragging = true;
            activePointerId = event.pointerId;
            try {
                handle.setPointerCapture(event.pointerId);
            } catch {
                // ignore capture errors
            }
            this.root?.classList.add('is-script-split-resizing');
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', stopDragging);
            window.addEventListener('pointercancel', stopDragging);
        };

        handle.addEventListener('pointerdown', onPointerDown);
        this.splitResizeCleanup = () => {
            handle.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', stopDragging);
            window.removeEventListener('pointercancel', stopDragging);
            this.root?.classList.remove('is-script-split-resizing');
        };
    }

    /**
     * Resolve active script.
     * @returns {any | null} Active script object.
     */
    getActiveScript() {
        if (!this.scriptId) {
            return null;
        }
        const state = this.getState();
        return state?.resources?.scripts?.byId?.[this.scriptId] || null;
    }

    /**
     * Create unique key for named entries.
     * @param {string[]} existing - Existing keys.
     * @param {string} seed - Base key.
     * @returns {string} Unique key.
     */
    createUniqueKey(existing, seed) {
        const used = new Set(existing || []);
        if (!used.has(seed)) {
            return seed;
        }
        let index = 2;
        while (used.has(`${seed}${index}`)) {
            index += 1;
        }
        return `${seed}${index}`;
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
