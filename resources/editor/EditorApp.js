import { EditorBus } from './EditorBus.js';
import { EditorRuntime } from './EditorRuntime.js';
import { SaveService } from './SaveService.js';
import { ExplorerPanel } from './ExplorerPanel.js';
import { TabManager } from './TabManager.js';
import { BUS } from './constants.js';

export class EditorApp {
    constructor() {
        this.elements = {
            app: document.querySelector('#editor-app'),
            nav: document.querySelector('#editor-sidebar-nav'),
            panel: document.querySelector('#editor-sidebar-panel'),
            resizeHandle: document.querySelector('#editor-sidebar-resize'),
            tabBar: document.querySelector('#editor-tabs'),
            stage: document.querySelector('#editor-stage'),
            canvasHost: document.querySelector('#editor-canvas-host'),
            canvasParkingHost: document.querySelector('#editor-canvas-parking'),
            saveButton: document.querySelector('#editor-save-button'),
            saveStatus: document.querySelector('#builder-save-status'),
            readyIndicator: document.querySelector('#editor-ready-indicator'),
            urlPreview: document.querySelector('#builder-url-preview'),
        };

        this.bus = new EditorBus();
        this.runtime = new EditorRuntime({
            bus: this.bus,
            canvasHost: this.elements.canvasHost,
            canvasParkingHost: this.elements.canvasParkingHost,
        });

        this.tabs = new TabManager({
            bus: this.bus,
            runtime: this.runtime,
            tabBar: this.elements.tabBar,
            stage: this.elements.stage,
        });

        this.explorer = new ExplorerPanel({
            bus: this.bus,
            runtime: this.runtime,
            tabs: this.tabs,
            navElement: this.elements.nav,
            panelElement: this.elements.panel,
            resizeHandle: this.elements.resizeHandle,
            layoutRoot: document.body,
        });

        this.saveService = new SaveService({
            bus: this.bus,
            runtime: this.runtime,
            saveButton: this.elements.saveButton,
            saveStatus: this.elements.saveStatus,
            urlPreview: this.elements.urlPreview,
        });
    }

    async init() {
        this.assertRequiredElements();
        this.tabs.init();
        this.saveService.init();
        this.bindStatusBar();

        await this.runtime.init();
        this.explorer.init();
        this.bootstrapDefaultTabs();

        if (this.elements.app) {
            this.elements.app.setAttribute('data-editor-ready', 'true');
        }
    }

    assertRequiredElements() {
        const missing = Object.entries(this.elements)
            .filter(function(entry) {
                return !entry[1] && !['saveButton'].includes(entry[0]);
            })
            .map(function(entry) {
                return entry[0];
            });

        if (missing.length) {
            throw new Error(`Editor element(s) missing: ${missing.join(', ')}`);
        }
    }

    bindStatusBar() {
        if (this.elements.readyIndicator) {
            this.elements.readyIndicator.textContent = 'Booting';
            this.elements.readyIndicator.classList.remove('is-ready');
        }

        this.bus.on(BUS.READY, () => {
            if (!this.elements.readyIndicator) {
                return;
            }

            this.elements.readyIndicator.textContent = 'Editor Ready';
            this.elements.readyIndicator.classList.add('is-ready');
        });
    }

    bootstrapDefaultTabs() {
        const site = this.runtime.getSite();
        if (!site) {
            return;
        }

        const active = site.getActiveID();
        if (active) {
            this.tabs.openPageTab(active);
            return;
        }

        const pages = site.listPages();
        if (pages.length > 0) {
            this.tabs.openPageTab(pages[0].id);
            return;
        }

        const pageId = site.addPage({ title: 'Home', slug: 'home' });
        site.changePage(pageId);
        this.tabs.openPageTab(pageId);
    }
}
