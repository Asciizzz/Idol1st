/**
 * Site settings panel for domain and page metadata actions.
 */
export class SiteSettingsPanel {
    /**
     * Create site settings panel.
     * @param {{
     *   getState: () => object,
     *   getActivePageId: () => string | null,
     *   onDomainChange: (label: string) => void,
     *   onCreatePage: () => void,
     *   onDuplicatePage: (pageId: string) => void,
     *   onSetStartPage: (pageId: string) => void,
     *   onDeletePage: (pageId: string) => void,
     *   onSelectPage: (pageId: string) => void,
     *   onUpdatePage: (pageId: string, patch: {
     *     title?: string,
     *     slug?: string,
     *     meta?: { seoTitle?: string, seoDescription?: string, visibility?: string },
     *     includes?: { styleIds?: string[], scriptIds?: string[] }
     *   }) => void,
     *   getDomainError: () => string | null
     * }} options - Panel options.
     */
    constructor(options) {
        /** @type {() => object} */
        this.getState = options.getState;
        /** @type {() => string | null} */
        this.getActivePageId = options.getActivePageId;
        /** @type {(label: string) => void} */
        this.onDomainChange = options.onDomainChange;
        /** @type {() => void} */
        this.onCreatePage = options.onCreatePage;
        /** @type {(pageId: string) => void} */
        this.onDuplicatePage = options.onDuplicatePage;
        /** @type {(pageId: string) => void} */
        this.onSetStartPage = options.onSetStartPage;
        /** @type {(pageId: string) => void} */
        this.onDeletePage = options.onDeletePage;
        /** @type {(pageId: string) => void} */
        this.onSelectPage = options.onSelectPage;
        /** @type {(pageId: string, patch: {
         *   title?: string,
         *   slug?: string,
         *   meta?: { seoTitle?: string, seoDescription?: string, visibility?: string },
         *   includes?: { styleIds?: string[], scriptIds?: string[] }
         * }) => void} */
        this.onUpdatePage = options.onUpdatePage;
        /** @type {() => string | null} */
        this.getDomainError = options.getDomainError;
        /** @type {HTMLElement | null} */
        this.root = null;
    }

    /**
     * Mount panel into host.
     * @param {HTMLElement} host - Panel host element.
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
        const domain = state?.project?.domain || { label: 'site', suffix: 'idolist', fqdn: 'site.idolist' };
        const pages = state?.resources?.pages?.byId || {};
        const styles = state?.resources?.styles?.byId || {};
        const scripts = state?.resources?.scripts?.byId || {};
        const pageOrder = Array.isArray(state?.resources?.pages?.order) ? state.resources.pages.order : Object.keys(pages);
        const startPageId = String(state?.resources?.pages?.startPageId || '');
        const activePageId = String(this.getActivePageId() || startPageId || pageOrder[0] || '');
        const activePage = pages[activePageId] || null;
        const domainError = this.getDomainError();

        const pageRows = pageOrder.map((pageId) => {
            const page = pages[pageId];
            if (!page) {
                return '';
            }

            return `
                <div class="vsb-page-row">
                    <button type="button" class="vsb-list-btn" data-page-select="${this.escapeHtml(pageId)}">${this.escapeHtml(page.title || pageId)}</button>
                    <div class="vsb-page-row-actions">
                        <button type="button" class="vsb-btn" data-set-start="${this.escapeHtml(pageId)}">${pageId === startPageId ? 'Start' : 'Set Start'}</button>
                        <button type="button" class="vsb-btn" data-duplicate-page="${this.escapeHtml(pageId)}">Duplicate</button>
                        <button type="button" class="vsb-btn is-danger" data-delete-page="${this.escapeHtml(pageId)}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        this.root.innerHTML = `
            <section class="vsb-panel-group">
                <h3>Domain</h3>
                <label class="vsb-field-label">Domain Label</label>
                <input class="vsb-input" data-role="domain-label" value="${this.escapeHtml(domain.label || 'site')}" />
                <div class="vsb-inline-help">Suffix: <strong>.idolist</strong></div>
                <div class="vsb-inline-help">Preview: <strong>${this.escapeHtml(domain.fqdn || 'site.idolist')}</strong></div>
                ${domainError ? `<div class="vsb-inline-error">${this.escapeHtml(domainError)}</div>` : ''}
            </section>
            <section class="vsb-panel-group">
                <h3>Pages</h3>
                <div class="vsb-list">${pageRows || '<div class="vsb-list-empty">No pages.</div>'}</div>
                <button type="button" class="vsb-btn vsb-btn-primary" data-create-page>Create Page</button>
            </section>
            <section class="vsb-panel-group">
                <h3>Page Metadata</h3>
                ${activePage ? this.renderActivePageMeta(activePage) : '<div class="vsb-list-empty">No active page.</div>'}
            </section>
            <section class="vsb-panel-group">
                <h3>Page Includes</h3>
                ${activePage ? this.renderActivePageIncludes(activePage, styles, scripts) : '<div class="vsb-list-empty">No active page.</div>'}
            </section>
        `;

        const domainInput = /** @type {HTMLInputElement | null} */ (this.root.querySelector('[data-role="domain-label"]'));
        if (domainInput) {
            domainInput.addEventListener('change', () => {
                this.onDomainChange(domainInput.value);
            });
        }

        this.root.querySelector('[data-create-page]')?.addEventListener('click', () => {
            this.onCreatePage();
        });

        this.root.querySelectorAll('[data-set-start]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const pageId = button.dataset.setStart || '';
                if (!pageId) {
                    return;
                }
                this.onSetStartPage(pageId);
            });
        });

        this.root.querySelectorAll('[data-delete-page]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const pageId = button.dataset.deletePage || '';
                if (!pageId) {
                    return;
                }
                this.onDeletePage(pageId);
            });
        });

        this.root.querySelectorAll('[data-duplicate-page]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const pageId = button.dataset.duplicatePage || '';
                if (!pageId) {
                    return;
                }
                this.onDuplicatePage(pageId);
            });
        });

        this.root.querySelectorAll('[data-page-select]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const pageId = button.dataset.pageSelect || '';
                if (!pageId) {
                    return;
                }
                this.onSelectPage(pageId);
            });
        });

        this.bindMetaField('[data-role="meta-title"]', (value) => {
            if (!activePageId) {
                return;
            }
            this.onUpdatePage(activePageId, { title: value });
        });
        this.bindMetaField('[data-role="meta-slug"]', (value) => {
            if (!activePageId) {
                return;
            }
            this.onUpdatePage(activePageId, { slug: value });
        });
        this.bindMetaField('[data-role="meta-seo-title"]', (value) => {
            if (!activePageId) {
                return;
            }
            this.onUpdatePage(activePageId, { meta: { seoTitle: value } });
        });
        this.bindMetaField('[data-role="meta-seo-description"]', (value) => {
            if (!activePageId) {
                return;
            }
            this.onUpdatePage(activePageId, { meta: { seoDescription: value } });
        });
        this.bindMetaField('[data-role="meta-visibility"]', (value) => {
            if (!activePageId) {
                return;
            }
            this.onUpdatePage(activePageId, { meta: { visibility: value } });
        });

        if (activePage && activePageId) {
            this.bindIncludeField('[data-role="include-style"]', (resourceId, checked) => {
                this.updateIncludeSelection(activePageId, activePage, 'style', resourceId, checked);
            });
            this.bindIncludeField('[data-role="include-script"]', (resourceId, checked) => {
                this.updateIncludeSelection(activePageId, activePage, 'script', resourceId, checked);
            });
        }
    }

    /**
     * Render active page metadata form.
     * @param {any} page - Active page object.
     * @returns {string} HTML content.
     */
    renderActivePageMeta(page) {
        const meta = page.meta && typeof page.meta === 'object' ? page.meta : {};
        const visibility = String(meta.visibility || 'public');
        return `
            <label class="vsb-field-label">Title</label>
            <input class="vsb-input" data-role="meta-title" value="${this.escapeHtml(String(page.title || ''))}" />
            <label class="vsb-field-label">Slug</label>
            <input class="vsb-input" data-role="meta-slug" value="${this.escapeHtml(String(page.slug || ''))}" />
            <label class="vsb-field-label">SEO Title</label>
            <input class="vsb-input" data-role="meta-seo-title" value="${this.escapeHtml(String(meta.seoTitle || ''))}" />
            <label class="vsb-field-label">SEO Description</label>
            <textarea class="vsb-textarea" data-role="meta-seo-description">${this.escapeHtml(String(meta.seoDescription || ''))}</textarea>
            <label class="vsb-field-label">Visibility</label>
            <select class="vsb-input" data-role="meta-visibility">
                <option value="public" ${visibility === 'public' ? 'selected' : ''}>public</option>
                <option value="private" ${visibility === 'private' ? 'selected' : ''}>private</option>
                <option value="unlisted" ${visibility === 'unlisted' ? 'selected' : ''}>unlisted</option>
            </select>
        `;
    }

    /**
     * Render include selectors for active page.
     * @param {any} page - Active page object.
     * @param {Record<string, any>} stylesById - Style resource map.
     * @param {Record<string, any>} scriptsById - Script resource map.
     * @returns {string} HTML content.
     */
    renderActivePageIncludes(page, stylesById, scriptsById) {
        const includes = page?.includes && typeof page.includes === 'object' ? page.includes : {};
        const styleIds = new Set(this.normalizeIdArray(includes.styleIds));
        const scriptIds = new Set(this.normalizeIdArray(includes.scriptIds));

        const styleRows = Object.values(stylesById || {}).map((style) => {
            const styleId = String(style?.id || '');
            if (!styleId) {
                return '';
            }
            const styleName = String(style?.name || styleId);
            return `
                <label class="vsb-include-row">
                    <input type="checkbox" data-role="include-style" data-resource-id="${this.escapeHtml(styleId)}" ${styleIds.has(styleId) ? 'checked' : ''} />
                    <span>${this.escapeHtml(styleName)}</span>
                </label>
            `;
        }).join('');

        const scriptRows = Object.values(scriptsById || {}).map((script) => {
            const scriptId = String(script?.id || '');
            if (!scriptId) {
                return '';
            }
            const scriptName = String(script?.name || scriptId);
            return `
                <label class="vsb-include-row">
                    <input type="checkbox" data-role="include-script" data-resource-id="${this.escapeHtml(scriptId)}" ${scriptIds.has(scriptId) ? 'checked' : ''} />
                    <span>${this.escapeHtml(scriptName)}</span>
                </label>
            `;
        }).join('');

        return `
            <label class="vsb-field-label">CSS Includes</label>
            <div class="vsb-list">${styleRows || '<div class="vsb-list-empty">No styles available.</div>'}</div>
            <label class="vsb-field-label">JavaScript Includes</label>
            <div class="vsb-list">${scriptRows || '<div class="vsb-list-empty">No scripts available.</div>'}</div>
        `;
    }

    /**
     * Bind meta field changes.
     * @param {string} selector - Query selector.
     * @param {(value: string) => void} onChange - Value callback.
     * @returns {void}
     */
    bindMetaField(selector, onChange) {
        if (!this.root) {
            return;
        }
        this.root.querySelectorAll(selector).forEach((node) => {
            const input = /** @type {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement} */ (node);
            input.addEventListener('change', () => {
                onChange(String(input.value || '').trim());
            });
        });
    }

    /**
     * Bind checkbox include toggles.
     * @param {string} selector - Checkbox selector.
     * @param {(resourceId: string, checked: boolean) => void} onChange - Include toggle callback.
     * @returns {void}
     */
    bindIncludeField(selector, onChange) {
        if (!this.root) {
            return;
        }
        this.root.querySelectorAll(selector).forEach((node) => {
            const input = /** @type {HTMLInputElement} */ (node);
            input.addEventListener('change', () => {
                const resourceId = String(input.dataset.resourceId || '').trim();
                if (!resourceId) {
                    return;
                }
                onChange(resourceId, input.checked);
            });
        });
    }

    /**
     * Update include ids for current page.
     * @param {string} pageId - Target page id.
     * @param {any} page - Current page object.
     * @param {'style' | 'script'} kind - Include kind.
     * @param {string} resourceId - Resource id.
     * @param {boolean} checked - Include state.
     * @returns {void}
     */
    updateIncludeSelection(pageId, page, kind, resourceId, checked) {
        const includes = page?.includes && typeof page.includes === 'object' ? page.includes : {};
        const styleIds = this.normalizeIdArray(includes.styleIds);
        const scriptIds = this.normalizeIdArray(includes.scriptIds);

        const targetList = kind === 'style' ? styleIds : scriptIds;
        const nextTarget = checked
            ? Array.from(new Set(targetList.concat(resourceId)))
            : targetList.filter((id) => id !== resourceId);

        this.onUpdatePage(pageId, {
            includes: {
                styleIds: kind === 'style' ? nextTarget : styleIds,
                scriptIds: kind === 'script' ? nextTarget : scriptIds,
            },
        });
    }

    /**
     * Normalize unknown include list to string id array.
     * @param {unknown} value - Include list input.
     * @returns {string[]} Normalized id array.
     */
    normalizeIdArray(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return value
            .map((item) => String(item || '').trim())
            .filter(Boolean);
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
