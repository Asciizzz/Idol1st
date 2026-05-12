import { BUS, TAB_KIND } from './constants.js';
import { Tab } from './Tab.js';
import { RenderPage } from './RenderPage.js';
import { RenderStyle } from './RenderStyle.js';
import { RenderScript } from './RenderScript.js';

export class TabManager {
    constructor(options) {
        this.bus = options.bus;
        this.runtime = options.runtime;
        this.tabBar = options.tabBar;
        this.stage = options.stage;
        this.tabs = new Map();
        this.activeTabId = null;
    }

    init() {
        this.tabBar.addEventListener('click', (event) => {
            const closeButton = event.target.closest('[data-tab-close]');
            if (closeButton) {
                event.stopPropagation();
                this.closeTab(closeButton.dataset.tabClose);
                return;
            }

            const button = event.target.closest('.editor-tab-button[data-tab-id]');
            if (!button) {
                return;
            }

            this.activateTab(button.dataset.tabId, { allowReselect: true });
        });

        this.bus.on(BUS.PAGES_CHANGED, () => this.syncPageTabTitles());
        this.bus.on(BUS.STYLES_CHANGED, () => this.syncStyleTabs());
        this.bus.on(BUS.SCRIPTS_CHANGED, () => this.syncScriptTabs());
        this.bus.on(BUS.PAGE_MODE_CHANGED, (payload) => this.syncPageTabMode(payload));
    }

    openPageTab(pageId) {
        const id = `page:${pageId}`;
        const existing = this.tabs.get(id);
        if (existing) {
            this.activateTab(id, { allowReselect: false });
            return existing;
        }

        const title = this.resolvePageTitle(pageId);
        return this.createAndOpen({
            id: id,
            kind: TAB_KIND.PAGE,
            title: title,
            closable: true,
            iconHTML: this.getIconHTML(TAB_KIND.PAGE),
            extraContentFactory: function() {
                const strip = document.createElement('div');
                strip.className = 'editor-tab-mode-strip';
                strip.dataset.pageModeStrip = 'true';

                const pageNode = document.createElement('span');
                pageNode.dataset.mode = 'page';
                pageNode.title = 'View';
                pageNode.textContent = 'View';

                const graphNode = document.createElement('span');
                graphNode.dataset.mode = 'graph';
                graphNode.title = 'Graph';
                graphNode.textContent = 'Graph';

                strip.append(pageNode, graphNode);
                return strip;
            },
            renderer: new RenderPage({
                runtime: this.runtime,
                bus: this.bus,
                pageId: pageId,
            }),
        });
    }

    openStyleTab(styleName) {
        const id = `style:${styleName}`;
        const existing = this.tabs.get(id);
        if (existing) {
            this.activateTab(id);
            return existing;
        }

        return this.createAndOpen({
            id: id,
            kind: TAB_KIND.STYLE,
            title: styleName,
            closable: true,
            iconHTML: this.getIconHTML(TAB_KIND.STYLE),
            renderer: new RenderStyle({
                runtime: this.runtime,
                bus: this.bus,
                styleName: styleName,
            }),
        });
    }

    openScriptTab(scriptName) {
        const id = `script:${scriptName}`;
        const existing = this.tabs.get(id);
        if (existing) {
            this.activateTab(id);
            return existing;
        }

        return this.createAndOpen({
            id: id,
            kind: TAB_KIND.SCRIPT,
            title: scriptName,
            closable: true,
            iconHTML: this.getIconHTML(TAB_KIND.SCRIPT),
            renderer: new RenderScript({
                runtime: this.runtime,
                bus: this.bus,
                scriptName: scriptName,
            }),
        });
    }

    createAndOpen(definition) {
        const tab = new Tab(definition);
        tab.mount(this.tabBar, this.stage);
        this.tabs.set(tab.id, tab);
        this.activateTab(tab.id, { allowReselect: false });
        this.bus.emit(BUS.TAB_OPENED, { tabId: tab.id, kind: tab.kind });
        return tab;
    }

    activateTab(tabId, options = {}) {
        const tab = this.tabs.get(tabId);
        if (!tab) {
            return;
        }

        const current = this.activeTabId ? this.tabs.get(this.activeTabId) : null;
        if (current && current.id === tab.id) {
            if (options.allowReselect && tab.kind === TAB_KIND.PAGE) {
                tab.reselect();
            }
            return;
        }

        if (current) {
            current.deactivate();
        }

        this.activeTabId = tab.id;
        tab.activate();
        this.bus.emit(BUS.TAB_ACTIVATED, { tabId: tab.id, kind: tab.kind });
    }

    closeTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) {
            return;
        }

        const wasActive = this.activeTabId === tab.id;
        if (wasActive) {
            this.runtime.parkCanvas();
        }
        tab.destroy();
        this.tabs.delete(tab.id);
        this.bus.emit(BUS.TAB_CLOSED, { tabId: tab.id, kind: tab.kind });

        if (!wasActive) {
            return;
        }

        this.activeTabId = null;
        const nextTab = Array.from(this.tabs.values()).pop();
        if (nextTab) {
            this.activateTab(nextTab.id, { allowReselect: false });
        } else {
            this.runtime.setCanvasVisible(false);
        }
    }

    closeTabsByPrefix(prefix) {
        Array.from(this.tabs.keys())
            .filter(function(tabId) {
                return tabId === prefix;
            })
            .forEach((tabId) => {
                this.closeTab(tabId);
            });
    }

    syncPageTabTitles() {
        const site = this.runtime.getSite();
        if (!site) {
            return;
        }

        const pages = site.listPages();
        const pageMap = new Map(pages.map(function(page) {
            return [page.id, page];
        }));

        Array.from(this.tabs.values())
            .filter(function(tab) {
                return tab.kind === TAB_KIND.PAGE;
            })
            .forEach((tab) => {
                const pageId = tab.id.replace(/^page:/, '');
                const page = pageMap.get(pageId);

                if (!page) {
                    this.closeTab(tab.id);
                    return;
                }

                tab.setTitle(page.title || page.slug || page.id);
            });
    }

    syncPageTabMode(payload) {
        const pageId = payload && payload.pageId ? payload.pageId : null;
        const mode = payload && payload.mode ? payload.mode : null;
        if (!pageId || !mode) {
            return;
        }

        const tab = this.tabs.get(`page:${pageId}`);
        if (!tab) {
            return;
        }

        tab.setModeIndicator(mode);
    }

    syncStyleTabs() {
        const site = this.runtime.getSite();
        if (!site) {
            return;
        }

        const names = new Set(site.listStylesheets());

        Array.from(this.tabs.values())
            .filter(function(tab) {
                return tab.kind === TAB_KIND.STYLE;
            })
            .forEach((tab) => {
                const styleName = tab.id.replace(/^style:/, '');
                if (!names.has(styleName)) {
                    this.closeTab(tab.id);
                }
            });
    }

    syncScriptTabs() {
        const site = this.runtime.getSite();
        if (!site) {
            return;
        }

        const data = site.getDataJSON() || {};
        const names = new Set(Object.keys(data.scripts || {}));

        Array.from(this.tabs.values())
            .filter(function(tab) {
                return tab.kind === TAB_KIND.SCRIPT;
            })
            .forEach((tab) => {
                const scriptName = tab.id.replace(/^script:/, '');
                if (!names.has(scriptName)) {
                    this.closeTab(tab.id);
                }
            });
    }

    resolvePageTitle(pageId) {
        const site = this.runtime.getSite();
        if (!site) {
            return pageId;
        }

        const page = site.listPages().find(function(item) {
            return item.id === pageId;
        });

        return page ? (page.title || page.slug || page.id) : pageId;
    }

    getIconHTML(kind) {
        if (kind === TAB_KIND.PAGE) {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l5 5v13H6zM14 4.5V9h4.5"></path></svg>';
        }

        if (kind === TAB_KIND.STYLE) {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h16v3H4z"></path></svg>';
        }

        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6 3 12l5 6 1.8-1.5L6.1 12l3.7-4.5zm8 0-1.8 1.5 3.7 4.5-3.7 4.5L16 18l5-6z"></path></svg>';
    }
}
