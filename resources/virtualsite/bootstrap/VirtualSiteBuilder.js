import { assertMountHost, markMounted, markUnmounted } from './mountGuards.js';
import { createWorkbenchDOM } from './createWorkbenchDOM.js';
import { normalizeProject } from '../schema/normalizeProject.js';
import { ProjectStore } from '../store/ProjectStore.js';
import { defaultDarkTheme } from '../theme/defaultDarkTheme.js';
import { defaultLightTheme } from '../theme/defaultLightTheme.js';
import { ThemeRegistry } from '../theme/ThemeRegistry.js';
import { ThemeApplier } from '../theme/ThemeApplier.js';
import { IframeRuntime } from '../renderer/IframeRuntime.js';
import { SidePanelNav } from '../ui/shell/SidePanelNav.js';
import { ExplorerPanel } from '../ui/panels/ExplorerPanel.js';
import { SiteSettingsPanel } from '../ui/panels/SiteSettingsPanel.js';
import { SettingsPanel } from '../ui/panels/SettingsPanel.js';
import { StyleEditorPanel } from '../ui/panels/StyleEditorPanel.js';
import { ScriptEditorPanel } from '../ui/panels/ScriptEditorPanel.js';
import { PageGraphPanel } from '../ui/panels/PageGraphPanel.js';
import { NodeInspectorPanel } from '../ui/panels/NodeInspectorPanel.js';
import { DomainPolicy } from '../integration/DomainPolicy.js';
import { SaveClient } from '../integration/SaveClient.js';
import { deepClone } from '../core/DeepClone.js';

const TAB_KIND = {
    PAGE: 'page',
    STYLE: 'style',
    SCRIPT: 'script',
};

const SIDE_PANEL_WIDTH_MIN = 10;
const SIDE_PANEL_WIDTH_MAX = 30;
const SIDE_PANEL_WIDTH_DEFAULT = 22;

const INSPECTOR_WIDTH_MIN = 1;
const INSPECTOR_WIDTH_MAX = 35;
const INSPECTOR_WIDTH_DEFAULT = 20;
const BOTH_SPLIT_MIN = 10;
const BOTH_SPLIT_MAX = 90;
const BOTH_SPLIT_DEFAULT = 50;

const PAGE_TOOL_MODE = {
    SELECT: 'select',
    ADD: 'add',
    DELETE: 'delete',
};

const DELETE_MODE = {
    SINGLE: 'single',
    BRANCH: 'branch',
};

const ADDABLE_TAG_GROUPS = [
    { title: 'Layout', tags: ['div', 'section', 'article', 'header', 'footer', 'main', 'nav'] },
    { title: 'Text', tags: ['p', 'span', 'h1', 'h2', 'h3', 'a'] },
    { title: 'Interactive', tags: ['button', 'input'] },
    { title: 'List', tags: ['ul', 'li'] },
    { title: 'Media', tags: ['img'] },
];

const BODY_NODE_ID = '__body__';

/**
 * Drop-and-use VirtualSite builder runtime.
 */
export class VirtualSiteBuilder {
    /**
     * Mount a builder instance into a host element.
     * @param {{
     *   host: HTMLElement,
     *   projectData?: unknown,
     *   session?: { tenantId?: string, userId?: string },
     *   persistence?: unknown,
     *   theme?: { initialThemeId?: string, catalog?: Array<unknown> },
     *   saveUrl?: string
     * }} options - Mount options.
     * @returns {Promise<VirtualSiteBuilder>} Mounted builder instance.
     */
    static async mount(options) {
        const builder = new VirtualSiteBuilder(options);
        await builder.init();
        return builder;
    }

    /**
     * Create builder instance.
     * @param {{
     *   host: HTMLElement,
     *   projectData?: unknown,
     *   session?: { tenantId?: string, userId?: string },
     *   persistence?: unknown,
     *   theme?: { initialThemeId?: string, catalog?: Array<unknown> },
     *   saveUrl?: string
     * }} options - Builder options.
     */
    constructor(options) {
        /** @type {HTMLElement} */
        this.host = options.host;
        /** @type {any} */
        this.options = options;
        /** @type {ReturnType<typeof createWorkbenchDOM> | null} */
        this.dom = null;
        /** @type {ProjectStore | null} */
        this.store = null;
        /** @type {ThemeRegistry | null} */
        this.themeRegistry = null;
        /** @type {IframeRuntime | null} */
        this.iframeRuntime = null;
        /** @type {SidePanelNav | null} */
        this.sidePanelNav = null;
        /** @type {ExplorerPanel | null} */
        this.explorerPanel = null;
        /** @type {SiteSettingsPanel | null} */
        this.siteSettingsPanel = null;
        /** @type {SettingsPanel | null} */
        this.settingsPanel = null;
        /** @type {StyleEditorPanel | null} */
        this.styleEditorPanel = null;
        /** @type {ScriptEditorPanel | null} */
        this.scriptEditorPanel = null;
        /** @type {PageGraphPanel | null} */
        this.pageGraphPanel = null;
        /** @type {NodeInspectorPanel | null} */
        this.nodeInspectorPanel = null;
        /** @type {SaveClient | null} */
        this.saveClient = null;
        /** @type {Array<() => void>} */
        this.unsubscribers = [];
        /** @type {string | null} */
        this.activeRenderedPanelKey = null;
        /** @type {string | null} */
        this.activeStageMountKey = null;
        /** @type {string | null} */
        this.domainError = null;
        /** @type {(() => void) | null} */
        this.sidePanelResizeCleanup = null;
        /** @type {(() => void) | null} */
        this.inspectorResizeCleanup = null;
        /** @type {(() => void) | null} */
        this.keyboardShortcutsCleanup = null;
        /** @type {(() => void) | null} */
        this.bothModeResizeCleanup = null;
        /** @type {(() => void) | null} */
        this.addNodePickerCleanup = null;
        /** @type {boolean} */
        this.skipNextFrameRefresh = false;
    }

    /**
     * Initialize internal modules and mount UI.
     * @returns {Promise<void>}
     */
    async init() {
        const host = assertMountHost(this.host);
        const draft = typeof window !== 'undefined' && window.creatorDraft ? window.creatorDraft : {};
        const saveUrl = String(this.options.saveUrl || window.creatorSaveUrl || '').trim();
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        this.dom = createWorkbenchDOM(host);
        markMounted(host);

        const initialState = normalizeProject(this.options.projectData || window.webConstructInitialProject || {}, {
            tenantId: this.options.session?.tenantId || String(draft.owner_user_id || 'guest'),
            userId: this.options.session?.userId || String(draft.owner_user_id || 'guest'),
            draft,
        });

        this.store = new ProjectStore(initialState);
        this.themeRegistry = this.createThemeRegistry(initialState);
        this.saveClient = new SaveClient({ saveUrl, csrfToken });

        this.sidePanelNav = new SidePanelNav({
            host: this.dom.sidePanelNav,
            onChange: (panelKey) => this.updateActivePanel(panelKey),
        });
        this.sidePanelNav.mount();

        this.iframeRuntime = new IframeRuntime({
            host: this.dom.iframeHost,
            getState: () => this.getState(),
        });
        this.iframeRuntime.mount();

        this.explorerPanel = new ExplorerPanel({
            getState: () => this.getState(),
            onSelectPage: (pageId) => this.openPageTab(pageId),
            onSelectStyle: (styleId) => this.openStyleTab(styleId),
            onSelectScript: (scriptId) => this.openScriptTab(scriptId),
            onRenamePage: (pageId, nextTitle) => this.renamePage(pageId, nextTitle),
            onRenameStyle: (styleId, nextName) => this.renameStyle(styleId, nextName),
            onRenameScript: (scriptId, nextName) => this.renameScript(scriptId, nextName),
            onDeletePage: (pageId) => this.deletePage(pageId),
            onDeleteStyle: (styleId) => this.deleteStyle(styleId),
            onDeleteScript: (scriptId) => this.deleteScript(scriptId),
            onCreateStyle: () => this.createStyle(),
            onCreateScript: () => this.createScript(),
        });

        this.siteSettingsPanel = new SiteSettingsPanel({
            getState: () => this.getState(),
            getActivePageId: () => this.getActivePageId(),
            onDomainChange: (label) => this.updateDomain(label),
            onCreatePage: () => this.createPage(),
            onDuplicatePage: (pageId) => this.duplicatePage(pageId),
            onSetStartPage: (pageId) => this.setStartPage(pageId),
            onDeletePage: (pageId) => this.deletePage(pageId),
            onSelectPage: (pageId) => this.openPageTab(pageId),
            onUpdatePage: (pageId, patch) => this.updatePage(pageId, patch),
            getDomainError: () => this.domainError,
        });

        this.settingsPanel = new SettingsPanel({
            getThemes: () => this.listThemes(),
            getActiveThemeId: () => this.getActiveThemeId(),
            onSetActiveTheme: (themeId) => this.setTheme(themeId),
            onImportThemeJson: (jsonText) => this.importThemeJson(jsonText),
            onDeleteTheme: (themeId) => this.deleteTheme(themeId),
        });

        this.styleEditorPanel = new StyleEditorPanel({
            getState: () => this.getState(),
            onUpdateStyle: (styleId, nextStyle) => this.updateStyle(styleId, nextStyle),
        });

        this.scriptEditorPanel = new ScriptEditorPanel({
            getState: () => this.getState(),
            onUpdateScript: (scriptId, nextScript) => this.updateScript(scriptId, nextScript),
        });

        this.pageGraphPanel = new PageGraphPanel({
            getState: () => this.getState(),
            getToolState: () => this.getPageToolState(),
            onSetToolMode: (mode) => this.setPageToolMode(mode),
            onToggleDeleteMode: () => this.toggleDeleteMode(),
            onPolishGraph: (pageId) => this.polishGraph(pageId),
            onUpdateNodeGraph: (pageId, nodeId, graphPatch) => this.updateNodeGraph(pageId, nodeId, graphPatch),
            onUpdateNodeData: (pageId, nodeId, patch) => this.updatePageNode(pageId, nodeId, patch),
            onReparentNode: (pageId, nodeId, targetParentId) => this.reparentNode(pageId, nodeId, targetParentId),
            onReorderChild: (pageId, parentNodeId, childNodeId, direction) => this.reorderNodeChild(pageId, parentNodeId, childNodeId, direction),
            onCreateNode: (pageId, parentNodeId, pointer) => this.createNode(pageId, parentNodeId, 'div', pointer),
            onDeleteNode: (pageId, nodeId) => this.deleteNode(pageId, nodeId),
        });

        this.bindSaveButton();
        this.syncSidePanelWidth();
        this.syncBothModeSplit();
        this.bindSidePanelResize();
        this.bindBothModeResize();
        this.ensureInitialTab();
        this.applyTheme();
        this.syncDomainPreview();
        this.renderTabs();
        this.renderActivePanel();
        this.renderStage();

        const unsubscribe = this.store.subscribe(() => {
            this.handleStateChange();
        });
        this.unsubscribers.push(unsubscribe);

        const initialActivePanel = this.getState()?.editor?.ui?.activePanelKey || 'explorer';
        this.sidePanelNav.setActive(initialActivePanel);
        this.updateActivePanel(initialActivePanel);
    }

    /**
     * Read state snapshot.
     * @returns {object} State snapshot.
     */
    getState() {
        return this.store ? this.store.getState() : {};
    }

    /**
     * Clamp side panel width percentage within hard limits.
     * @param {unknown} widthPercent - Candidate width percent.
     * @returns {number} Clamped width percent.
     */
    clampSidePanelWidth(widthPercent) {
        const numeric = Number(widthPercent);
        if (!Number.isFinite(numeric)) {
            return SIDE_PANEL_WIDTH_DEFAULT;
        }
        return Math.min(SIDE_PANEL_WIDTH_MAX, Math.max(SIDE_PANEL_WIDTH_MIN, numeric));
    }

    /**
     * Resolve side panel width from state.
     * @returns {number} Width percentage in viewport units.
     */
    getSidePanelWidth() {
        const stateWidth = this.getState()?.editor?.ui?.leftPanelWidth;
        return this.clampSidePanelWidth(stateWidth);
    }

    /**
     * Apply side panel width to the runtime DOM.
     * @returns {void}
     */
    syncSidePanelWidth() {
        if (!this.dom) {
            return;
        }
        const width = this.getSidePanelWidth();
        this.dom.root.style.setProperty('--vsb-side-panel-width', `${width}vw`);
        this.dom.sidePanelResizer.setAttribute('aria-valuemin', String(SIDE_PANEL_WIDTH_MIN));
        this.dom.sidePanelResizer.setAttribute('aria-valuemax', String(SIDE_PANEL_WIDTH_MAX));
        this.dom.sidePanelResizer.setAttribute('aria-valuenow', String(Math.round(width * 100) / 100));
    }

    /**
     * Persist side panel width in editor UI state.
     * @param {number} widthPercent - Width percentage to persist.
     * @returns {void}
     */
    persistSidePanelWidth(widthPercent) {
        if (!this.store) {
            return;
        }

        const nextWidth = this.clampSidePanelWidth(widthPercent);
        const currentWidth = this.clampSidePanelWidth(this.getState()?.editor?.ui?.leftPanelWidth);
        if (Math.abs(currentWidth - nextWidth) < 0.01) {
            return;
        }

        this.store.update((draft) => {
            draft.editor ||= {};
            draft.editor.ui ||= {};
            draft.editor.ui.leftPanelWidth = nextWidth;
        });
    }

    /**
     * Convert pointer x coordinate into side panel width percentage.
     * @param {number} clientX - Pointer client x.
     * @returns {number} Width percentage clamped to allowed range.
     */
    resolveSidePanelWidthFromPointer(clientX) {
        if (!this.dom) {
            return SIDE_PANEL_WIDTH_DEFAULT;
        }

        const rootRect = this.dom.root.getBoundingClientRect();
        const navWidth = this.dom.sidePanelNav.getBoundingClientRect().width || 0;
        const panelWidthPx = clientX - rootRect.left - navWidth;
        const viewportWidth = Math.max(window.innerWidth || 0, 1);
        const widthPercent = (panelWidthPx / viewportWidth) * 100;
        return this.clampSidePanelWidth(widthPercent);
    }

    /**
     * Bind drag-to-resize behavior for the side panel.
     * @returns {void}
     */
    bindSidePanelResize() {
        if (!this.dom) {
            return;
        }

        this.sidePanelResizeCleanup?.();
        const handle = this.dom.sidePanelResizer;
        let isDragging = false;
        let liveWidth = this.getSidePanelWidth();
        let activePointerId = null;

        const onPointerMove = (event) => {
            if (!isDragging || (activePointerId !== null && event.pointerId !== activePointerId)) {
                return;
            }
            event.preventDefault();
            liveWidth = this.resolveSidePanelWidthFromPointer(event.clientX);
            this.dom?.root.style.setProperty('--vsb-side-panel-width', `${liveWidth}vw`);
            handle.setAttribute('aria-valuenow', String(Math.round(liveWidth * 100) / 100));
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
                    // ignore capture release errors
                }
            }
            activePointerId = null;
            this.dom?.root.classList.remove('is-side-resizing');
            this.persistSidePanelWidth(liveWidth);
            this.syncSidePanelWidth();
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', stopDragging);
            window.removeEventListener('pointercancel', stopDragging);
        };

        const onPointerDown = (event) => {
            if (event.button !== 0) {
                return;
            }
            if (!this.dom || this.getState()?.editor?.ui?.activePanelKey == null) {
                return;
            }
            event.preventDefault();
            isDragging = true;
            activePointerId = event.pointerId;
            try {
                handle.setPointerCapture(event.pointerId);
            } catch {
                // ignore capture setup errors
            }
            liveWidth = this.resolveSidePanelWidthFromPointer(event.clientX);
            this.dom.root.classList.add('is-side-resizing');
            this.dom.root.style.setProperty('--vsb-side-panel-width', `${liveWidth}vw`);
            handle.setAttribute('aria-valuenow', String(Math.round(liveWidth * 100) / 100));
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', stopDragging);
            window.addEventListener('pointercancel', stopDragging);
        };

        const onWindowResize = () => {
            this.syncSidePanelWidth();
        };

        handle.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('resize', onWindowResize);

        this.sidePanelResizeCleanup = () => {
            handle.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', stopDragging);
            window.removeEventListener('pointercancel', stopDragging);
            window.removeEventListener('resize', onWindowResize);
            this.dom?.root.classList.remove('is-side-resizing');
        };
    }

    /**
     * Clamp iframe-vs-graph split percentage within hard limits.
     * @param {unknown} splitPercent - Candidate split percent for left pane.
     * @returns {number} Clamped percent.
     */
    clampBothModeSplit(splitPercent) {
        const numeric = Number(splitPercent);
        if (!Number.isFinite(numeric)) {
            return BOTH_SPLIT_DEFAULT;
        }
        return Math.min(BOTH_SPLIT_MAX, Math.max(BOTH_SPLIT_MIN, numeric));
    }

    /**
     * Resolve both-mode split percentage from editor state.
     * @returns {number} Left pane width percentage.
     */
    getBothModeSplit() {
        return this.clampBothModeSplit(this.getState()?.editor?.ui?.bothPanePercent);
    }

    /**
     * Apply both-mode split css variable and aria metadata.
     * @returns {void}
     */
    syncBothModeSplit() {
        if (!this.dom) {
            return;
        }
        const split = this.getBothModeSplit();
        this.dom.root.style.setProperty('--vsb-both-left-width', `${split}%`);
        this.dom.bothModeResizer.setAttribute('aria-valuemin', String(BOTH_SPLIT_MIN));
        this.dom.bothModeResizer.setAttribute('aria-valuemax', String(BOTH_SPLIT_MAX));
        this.dom.bothModeResizer.setAttribute('aria-valuenow', String(Math.round(split * 100) / 100));
    }

    /**
     * Persist both-mode split percentage.
     * @param {number} splitPercent - Left pane width percentage.
     * @returns {void}
     */
    persistBothModeSplit(splitPercent) {
        if (!this.store) {
            return;
        }
        const next = this.clampBothModeSplit(splitPercent);
        const current = this.clampBothModeSplit(this.getState()?.editor?.ui?.bothPanePercent);
        if (Math.abs(current - next) < 0.01) {
            return;
        }
        this.store.update((draft) => {
            draft.editor ||= {};
            draft.editor.ui ||= {};
            draft.editor.ui.bothPanePercent = next;
        });
    }

    /**
     * Convert pointer x coordinate into both-mode left split percent.
     * @param {number} clientX - Pointer client x.
     * @returns {number} Split percentage.
     */
    resolveBothModeSplitFromPointer(clientX) {
        if (!this.dom) {
            return BOTH_SPLIT_DEFAULT;
        }
        const rect = this.dom.stageBody.getBoundingClientRect();
        const width = Math.max(rect.width, 1);
        const raw = ((clientX - rect.left) / width) * 100;
        return this.clampBothModeSplit(raw);
    }

    /**
     * Bind drag-to-resize behavior for iframe|graph split in both mode.
     * @returns {void}
     */
    bindBothModeResize() {
        if (!this.dom) {
            return;
        }
        this.bothModeResizeCleanup?.();
        const handle = this.dom.bothModeResizer;
        let isDragging = false;
        let liveSplit = this.getBothModeSplit();
        let activePointerId = null;

        const onPointerMove = (event) => {
            if (!isDragging || (activePointerId !== null && event.pointerId !== activePointerId)) {
                return;
            }
            event.preventDefault();
            liveSplit = this.resolveBothModeSplitFromPointer(event.clientX);
            this.dom?.root.style.setProperty('--vsb-both-left-width', `${liveSplit}%`);
            handle.setAttribute('aria-valuenow', String(Math.round(liveSplit * 100) / 100));
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
                    // ignore capture release errors
                }
            }
            activePointerId = null;
            this.dom?.root.classList.remove('is-both-resizing');
            this.persistBothModeSplit(liveSplit);
            this.syncBothModeSplit();
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', stopDragging);
            window.removeEventListener('pointercancel', stopDragging);
        };

        const onPointerDown = (event) => {
            if (event.button !== 0 || !this.dom) {
                return;
            }
            if (!this.dom.root.classList.contains('is-page-both')) {
                return;
            }
            event.preventDefault();
            isDragging = true;
            activePointerId = event.pointerId;
            try {
                handle.setPointerCapture(event.pointerId);
            } catch {
                // ignore capture setup errors
            }
            liveSplit = this.resolveBothModeSplitFromPointer(event.clientX);
            this.dom.root.classList.add('is-both-resizing');
            this.dom.root.style.setProperty('--vsb-both-left-width', `${liveSplit}%`);
            handle.setAttribute('aria-valuenow', String(Math.round(liveSplit * 100) / 100));
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', stopDragging);
            window.addEventListener('pointercancel', stopDragging);
        };

        const onWindowResize = () => {
            this.syncBothModeSplit();
        };

        handle.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('resize', onWindowResize);

        this.bothModeResizeCleanup = () => {
            handle.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', stopDragging);
            window.removeEventListener('pointercancel', stopDragging);
            window.removeEventListener('resize', onWindowResize);
            this.dom?.root.classList.remove('is-both-resizing');
        };
    }

    /**
     * Clamp inspector width percentage within hard limits.
     * @param {unknown} widthPercent - Candidate width percent.
     * @returns {number} Clamped width percent.
     */
    clampInspectorWidth(widthPercent) {
        const numeric = Number(widthPercent);
        if (!Number.isFinite(numeric)) {
            return INSPECTOR_WIDTH_DEFAULT;
        }
        return Math.min(INSPECTOR_WIDTH_MAX, Math.max(INSPECTOR_WIDTH_MIN, numeric));
    }

    /**
     * Resolve inspector width from editor state.
     * @returns {number} Width percentage in viewport units.
     */
    getInspectorWidth() {
        return this.clampInspectorWidth(this.getState()?.editor?.ui?.rightPanelWidth);
    }

    /**
     * Apply inspector width css variable and aria metadata.
     * @returns {void}
     */
    syncInspectorWidth() {
        if (!this.dom) {
            return;
        }
        const width = this.getInspectorWidth();
        this.dom.root.style.setProperty('--vsb-inspector-width', `${width}vw`);
        this.dom.inspectorResizer.setAttribute('aria-valuemin', String(INSPECTOR_WIDTH_MIN));
        this.dom.inspectorResizer.setAttribute('aria-valuemax', String(INSPECTOR_WIDTH_MAX));
        this.dom.inspectorResizer.setAttribute('aria-valuenow', String(Math.round(width * 100) / 100));
    }

    /**
     * Persist inspector width into UI state.
     * @param {number} widthPercent - Width percentage.
     * @returns {void}
     */
    persistInspectorWidth(widthPercent) {
        if (!this.store) {
            return;
        }
        const nextWidth = this.clampInspectorWidth(widthPercent);
        const currentWidth = this.clampInspectorWidth(this.getState()?.editor?.ui?.rightPanelWidth);
        if (Math.abs(currentWidth - nextWidth) < 0.01) {
            return;
        }

        this.store.update((draft) => {
            draft.editor ||= {};
            draft.editor.ui ||= {};
            draft.editor.ui.rightPanelWidth = nextWidth;
        });
    }

    /**
     * Convert pointer x coordinate into inspector width percentage.
     * @param {number} clientX - Pointer client x.
     * @returns {number} Width percentage clamped to allowed range.
     */
    resolveInspectorWidthFromPointer(clientX) {
        if (!this.dom) {
            return INSPECTOR_WIDTH_DEFAULT;
        }
        const rootRect = this.dom.root.getBoundingClientRect();
        const viewportWidth = Math.max(window.innerWidth || 0, 1);
        const panelWidthPx = rootRect.right - clientX;
        return this.clampInspectorWidth((panelWidthPx / viewportWidth) * 100);
    }

    /**
     * Bind drag-to-resize behavior for inspector panel.
     * @returns {void}
     */
    bindInspectorResize() {
        if (!this.dom) {
            return;
        }

        this.inspectorResizeCleanup?.();
        const handle = this.dom.inspectorResizer;
        let isDragging = false;
        let liveWidth = this.getInspectorWidth();

        const onPointerMove = (event) => {
            if (!isDragging) {
                return;
            }
            event.preventDefault();
            liveWidth = this.resolveInspectorWidthFromPointer(event.clientX);
            this.dom?.root.style.setProperty('--vsb-inspector-width', `${liveWidth}vw`);
            handle.setAttribute('aria-valuenow', String(Math.round(liveWidth * 100) / 100));
        };

        const stopDragging = () => {
            if (!isDragging) {
                return;
            }
            isDragging = false;
            this.dom?.root.classList.remove('is-inspector-resizing');
            this.persistInspectorWidth(liveWidth);
            this.syncInspectorWidth();
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', stopDragging);
            window.removeEventListener('pointercancel', stopDragging);
        };

        const onPointerDown = (event) => {
            if (event.button !== 0 || !this.dom) {
                return;
            }
            if (this.getState()?.editor?.ui?.activePanelKey == null) {
                return;
            }
            event.preventDefault();
            isDragging = true;
            liveWidth = this.resolveInspectorWidthFromPointer(event.clientX);
            this.dom.root.classList.add('is-inspector-resizing');
            this.dom.root.style.setProperty('--vsb-inspector-width', `${liveWidth}vw`);
            handle.setAttribute('aria-valuenow', String(Math.round(liveWidth * 100) / 100));
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', stopDragging);
            window.addEventListener('pointercancel', stopDragging);
        };

        const onWindowResize = () => {
            this.syncInspectorWidth();
        };

        handle.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('resize', onWindowResize);

        this.inspectorResizeCleanup = () => {
            handle.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', stopDragging);
            window.removeEventListener('pointercancel', stopDragging);
            window.removeEventListener('resize', onWindowResize);
            this.dom?.root.classList.remove('is-inspector-resizing');
        };
    }

    /**
     * Resolve current page tool mode + delete mode.
     * @returns {{ mode: 'select' | 'add' | 'delete', deleteMode: 'single' | 'branch' }} Page tool state.
     */
    getPageToolState() {
        const rawMode = String(this.getState()?.editor?.ui?.pageToolMode || PAGE_TOOL_MODE.SELECT);
        const rawDeleteMode = String(this.getState()?.editor?.ui?.deleteMode || DELETE_MODE.SINGLE);
        const mode = rawMode === PAGE_TOOL_MODE.ADD || rawMode === PAGE_TOOL_MODE.DELETE
            ? rawMode
            : PAGE_TOOL_MODE.SELECT;
        const deleteMode = rawDeleteMode === DELETE_MODE.BRANCH
            ? DELETE_MODE.BRANCH
            : DELETE_MODE.SINGLE;
        return { mode, deleteMode };
    }

    /**
     * Persist active page tool mode.
     * @param {'select' | 'add' | 'delete'} mode - Next tool mode.
     * @returns {void}
     */
    setPageToolMode(mode) {
        if (!this.store) {
            return;
        }
        const nextMode = mode === PAGE_TOOL_MODE.ADD || mode === PAGE_TOOL_MODE.DELETE
            ? mode
            : PAGE_TOOL_MODE.SELECT;
        if (this.getPageToolState().mode === nextMode) {
            return;
        }
        if (nextMode !== PAGE_TOOL_MODE.ADD) {
            this.closeAddNodePicker();
        }
        this.store.update((draft) => {
            draft.editor ||= {};
            draft.editor.ui ||= {};
            draft.editor.ui.pageToolMode = nextMode;
        });
    }

    /**
     * Toggle delete behavior between single and branch.
     * @returns {void}
     */
    toggleDeleteMode() {
        if (!this.store) {
            return;
        }
        const current = this.getPageToolState().deleteMode;
        const next = current === DELETE_MODE.SINGLE ? DELETE_MODE.BRANCH : DELETE_MODE.SINGLE;
        this.store.update((draft) => {
            draft.editor ||= {};
            draft.editor.ui ||= {};
            draft.editor.ui.deleteMode = next;
        });
    }

    /**
     * Bind tool rail mode switching buttons.
     * @returns {void}
     */
    bindToolRail() {
        if (!this.dom) {
            return;
        }
        this.dom.toolRail.querySelectorAll('[data-tool-mode]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const mode = String(button.dataset.toolMode || PAGE_TOOL_MODE.SELECT);
                if (mode === PAGE_TOOL_MODE.SELECT || mode === PAGE_TOOL_MODE.ADD || mode === PAGE_TOOL_MODE.DELETE) {
                    if (mode === PAGE_TOOL_MODE.DELETE && this.getPageToolState().mode === PAGE_TOOL_MODE.DELETE) {
                        this.toggleDeleteMode();
                        return;
                    }
                    this.setPageToolMode(mode);
                }
            });
        });
        this.syncToolRailButtons();
    }

    /**
     * Sync tool rail active styles and titles.
     * @returns {void}
     */
    syncToolRailButtons() {
        if (!this.dom) {
            return;
        }
        const state = this.getPageToolState();
        this.dom.toolRail.querySelectorAll('[data-tool-mode]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.classList.toggle('is-active', button.dataset.toolMode === state.mode);
            if (button.dataset.toolMode === PAGE_TOOL_MODE.DELETE) {
                button.classList.toggle('is-delete-single', state.mode === PAGE_TOOL_MODE.DELETE && state.deleteMode === DELETE_MODE.SINGLE);
                button.classList.toggle('is-delete-branch', state.mode === PAGE_TOOL_MODE.DELETE && state.deleteMode === DELETE_MODE.BRANCH);
            } else {
                button.classList.remove('is-delete-single');
                button.classList.remove('is-delete-branch');
            }
        });
        this.dom.toolRail.querySelectorAll('[data-delete-mode-label]').forEach((node) => {
            node.textContent = state.mode === PAGE_TOOL_MODE.DELETE ? state.deleteMode : 'delete';
        });
    }

    /**
     * Bind global keyboard shortcuts for page tools.
     * @returns {void}
     */
    bindKeyboardShortcuts() {
        this.keyboardShortcutsCleanup?.();

        const onKeyDown = (event) => {
            if (!this.canHandleShortcutEvent(event)) {
                return;
            }
            const key = String(event.key || '').toLowerCase();
            if (event.shiftKey && key === 'w') {
                event.preventDefault();
                this.setPageToolMode(PAGE_TOOL_MODE.SELECT);
                return;
            }
            if (event.shiftKey && key === 'a') {
                event.preventDefault();
                this.setPageToolMode(PAGE_TOOL_MODE.ADD);
                return;
            }
            if (event.shiftKey && key === 'd') {
                event.preventDefault();
                if (this.getPageToolState().mode === PAGE_TOOL_MODE.DELETE) {
                    this.toggleDeleteMode();
                } else {
                    this.setPageToolMode(PAGE_TOOL_MODE.DELETE);
                }
                return;
            }
            if (!event.shiftKey && key === 'd' && this.getPageToolState().mode === PAGE_TOOL_MODE.DELETE) {
                event.preventDefault();
                this.toggleDeleteMode();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        this.keyboardShortcutsCleanup = () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }

    /**
     * Guard shortcut handling while user types in form fields.
     * @param {KeyboardEvent} event - Keyboard event.
     * @returns {boolean} True when shortcut should be handled.
     */
    canHandleShortcutEvent(event) {
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
     * Render right-side node inspector panel.
     * @returns {void}
     */
    renderNodeInspector() {
        this.nodeInspectorPanel?.render();
    }

    /**
     * Ensure there is at least one open tab at startup.
     * @returns {void}
     */
    ensureInitialTab() {
        if (!this.store) {
            return;
        }

        const tabs = this.getTabsState();
        if (tabs.openTabs.length > 0 && tabs.activeTabId) {
            return;
        }

        const startPageId = this.getState()?.resources?.pages?.startPageId || this.getFirstPageId();
        if (!startPageId) {
            return;
        }
        this.openPageTab(startPageId, { activate: true, mode: 'view' });
    }

    /**
     * Handle state change propagation.
     * @returns {void}
     */
    handleStateChange() {
        this.syncDomainPreview();
        this.renderTabs();
        this.renderActivePanel();
        this.syncSidePanelWidth();
        this.syncBothModeSplit();
        const skipFrameRefresh = this.skipNextFrameRefresh;
        this.skipNextFrameRefresh = false;
        this.renderStage({ skipFrameRefresh });
        this.applyTheme();
    }

    /**
     * Create theme registry with built-ins and persisted catalog.
     * @param {object} state - Initial state.
     * @returns {ThemeRegistry} Theme registry.
     */
    createThemeRegistry(state) {
        const registry = new ThemeRegistry({
            builtins: [defaultDarkTheme, defaultLightTheme],
            activeThemeId: state?.editor?.theme?.activeThemeId || this.options.theme?.initialThemeId || 'default-dark',
        });

        const catalog = state?.editor?.theme?.catalog && typeof state.editor.theme.catalog === 'object'
            ? state.editor.theme.catalog
            : {};
        Object.values(catalog).forEach((theme) => {
            if (theme && typeof theme === 'object' && theme.kind === 'custom') {
                registry.registerCustomTheme(theme);
            }
        });

        (this.options.theme?.catalog || []).forEach((theme) => {
            registry.registerCustomTheme(theme);
        });

        registry.setActiveTheme(state?.editor?.theme?.activeThemeId || this.options.theme?.initialThemeId || 'default-dark');
        return registry;
    }

    /**
     * Resolve tabs state with defaults.
     * @returns {{ activeTabId: string | null, openTabs: Array<{ id: string, kind: "page" | "style" | "script", refId: string, mode?: string }> }} Tabs state.
     */
    getTabsState() {
        const tabs = this.getState()?.editor?.tabs || {};
        const openTabs = Array.isArray(tabs.openTabs) ? tabs.openTabs : [];
        return {
            activeTabId: tabs.activeTabId ? String(tabs.activeTabId) : null,
            openTabs: openTabs.map((tab) => ({
                id: String(tab.id || ''),
                kind: tab.kind === TAB_KIND.STYLE || tab.kind === TAB_KIND.SCRIPT ? tab.kind : TAB_KIND.PAGE,
                refId: String(tab.refId || ''),
                mode: tab.mode ? String(tab.mode) : undefined,
            })).filter((tab) => tab.id && tab.refId),
        };
    }

    /**
     * Persist tabs state.
     * @param {{ activeTabId: string | null, openTabs: Array<{ id: string, kind: "page" | "style" | "script", refId: string, mode?: string }> }} nextTabs - Next tabs state.
     * @returns {void}
     */
    setTabsState(nextTabs) {
        if (!this.store) {
            return;
        }

        this.store.update((draft) => {
            draft.editor ||= {};
            draft.editor.tabs ||= {};
            draft.editor.tabs.activeTabId = nextTabs.activeTabId;
            draft.editor.tabs.openTabs = nextTabs.openTabs;
        });
    }

    /**
     * Build deterministic tab id.
     * @param {"page" | "style" | "script"} kind - Tab kind.
     * @param {string} refId - Resource id.
     * @returns {string} Tab id.
     */
    buildTabId(kind, refId) {
        return `tab:${kind}:${refId}`;
    }

    /**
     * Open page tab.
     * @param {string} pageId - Page id.
     * @param {{ activate?: boolean, mode?: "view" | "graph" | "both" }} [options] - Open options.
     * @returns {void}
     */
    openPageTab(pageId, options = {}) {
        const mode = options.mode === 'graph' || options.mode === 'both' ? options.mode : 'view';
        const id = this.buildTabId(TAB_KIND.PAGE, pageId);
        this.openTab({
            id,
            kind: TAB_KIND.PAGE,
            refId: pageId,
            mode,
        }, options.activate !== false);
    }

    /**
     * Open style tab.
     * @param {string} styleId - Style id.
     * @param {{ activate?: boolean }} [options] - Open options.
     * @returns {void}
     */
    openStyleTab(styleId, options = {}) {
        const id = this.buildTabId(TAB_KIND.STYLE, styleId);
        this.openTab({
            id,
            kind: TAB_KIND.STYLE,
            refId: styleId,
        }, options.activate !== false);
    }

    /**
     * Open script tab.
     * @param {string} scriptId - Script id.
     * @param {{ activate?: boolean }} [options] - Open options.
     * @returns {void}
     */
    openScriptTab(scriptId, options = {}) {
        const id = this.buildTabId(TAB_KIND.SCRIPT, scriptId);
        this.openTab({
            id,
            kind: TAB_KIND.SCRIPT,
            refId: scriptId,
        }, options.activate !== false);
    }

    /**
     * Open tab if missing and optionally activate it.
     * @param {{ id: string, kind: "page" | "style" | "script", refId: string, mode?: string }} tab - Tab descriptor.
     * @param {boolean} activate - Activate after open.
     * @returns {void}
     */
    openTab(tab, activate) {
        const tabs = this.getTabsState();
        const existing = tabs.openTabs.find((item) => item.id === tab.id);
        const nextTabs = {
            activeTabId: tabs.activeTabId,
            openTabs: tabs.openTabs.slice(),
        };

        if (!existing) {
            nextTabs.openTabs.push(tab);
        } else if (tab.kind === TAB_KIND.PAGE && tab.mode && existing.mode !== tab.mode) {
            existing.mode = tab.mode;
        }

        if (activate) {
            nextTabs.activeTabId = tab.id;
        } else if (!nextTabs.activeTabId) {
            nextTabs.activeTabId = tab.id;
        }

        this.setTabsState(nextTabs);
    }

    /**
     * Activate a tab by id.
     * @param {string} tabId - Tab id.
     * @returns {void}
     */
    activateTab(tabId) {
        const tabs = this.getTabsState();
        if (!tabs.openTabs.some((tab) => tab.id === tabId)) {
            return;
        }
        this.setTabsState({
            activeTabId: tabId,
            openTabs: tabs.openTabs,
        });
    }

    /**
     * Close a tab.
     * @param {string} tabId - Tab id.
     * @returns {void}
     */
    closeTab(tabId) {
        const tabs = this.getTabsState();
        const openTabs = tabs.openTabs.filter((tab) => tab.id !== tabId);
        let activeTabId = tabs.activeTabId;
        if (activeTabId === tabId) {
            activeTabId = openTabs.length > 0 ? openTabs[openTabs.length - 1].id : null;
        }

        this.setTabsState({ activeTabId, openTabs });

        if (!activeTabId) {
            const fallbackPageId = this.getState()?.resources?.pages?.startPageId || this.getFirstPageId();
            if (fallbackPageId) {
                this.openPageTab(fallbackPageId, { activate: true, mode: 'view' });
            }
        }
    }

    /**
     * Resolve active tab descriptor.
     * @returns {{ id: string, kind: "page" | "style" | "script", refId: string, mode?: string } | null} Active tab.
     */
    getActiveTab() {
        const tabs = this.getTabsState();
        if (!tabs.activeTabId) {
            return null;
        }
        return tabs.openTabs.find((tab) => tab.id === tabs.activeTabId) || null;
    }

    /**
     * Toggle page tab mode between view and graph.
     * @returns {void}
     */
    toggleActivePageMode() {
        const tabs = this.getTabsState();
        const active = this.getActiveTab();
        if (!active || active.kind !== TAB_KIND.PAGE) {
            return;
        }
        const nextMode = active.mode === 'graph' ? 'view' : 'graph';
        const nextOpenTabs = tabs.openTabs.map((tab) => (
            tab.id === active.id ? { ...tab, mode: nextMode } : tab
        ));
        this.setTabsState({
            activeTabId: active.id,
            openTabs: nextOpenTabs,
        });
    }

    /**
     * Set active page tab mode.
     * @param {'view' | 'graph' | 'both'} mode - Target mode.
     * @returns {void}
     */
    setActivePageMode(mode) {
        const tabs = this.getTabsState();
        const active = this.getActiveTab();
        if (!active || active.kind !== TAB_KIND.PAGE) {
            return;
        }
        const nextMode = mode === 'graph' || mode === 'both' ? mode : 'view';
        const nextOpenTabs = tabs.openTabs.map((tab) => (
            tab.id === active.id ? { ...tab, mode: nextMode } : tab
        ));
        this.setTabsState({
            activeTabId: active.id,
            openTabs: nextOpenTabs,
        });
    }

    /**
     * Update active panel in state and UI.
     * @param {string | null} panelKey - Panel key.
     * @returns {void}
     */
    updateActivePanel(panelKey) {
        if (!this.store) {
            return;
        }
        this.store.update((draft) => {
            draft.editor ||= {};
            draft.editor.ui ||= {};
            draft.editor.ui.activePanelKey = panelKey;
        });
    }

    /**
     * Render currently active side panel section.
     * @returns {void}
     */
    renderActivePanel() {
        if (!this.dom) {
            return;
        }

        const panelKey = this.getState()?.editor?.ui?.activePanelKey || null;
        this.sidePanelNav?.setActive(panelKey);
        if (!panelKey) {
            this.dom.sidePanelTitle.textContent = '';
            this.dom.sidePanelContainer.replaceChildren();
            this.dom.root.classList.add('is-side-panel-collapsed');
            this.activeRenderedPanelKey = null;
            return;
        }

        this.dom.root.classList.remove('is-side-panel-collapsed');
        this.dom.sidePanelTitle.textContent = SidePanelNav.labelFor(panelKey);

        if (this.activeRenderedPanelKey === panelKey) {
            this.renderPanelByKey(panelKey);
            return;
        }

        this.activeRenderedPanelKey = panelKey;
        this.mountPanelByKey(panelKey);
    }

    /**
     * Mount side panel by section key.
     * @param {string} panelKey - Section key.
     * @returns {void}
     */
    mountPanelByKey(panelKey) {
        if (!this.dom) {
            return;
        }

        if (panelKey === 'explorer') {
            this.explorerPanel?.mount(this.dom.sidePanelContainer);
            return;
        }

        if (panelKey === 'siteSetting') {
            this.siteSettingsPanel?.mount(this.dom.sidePanelContainer);
            return;
        }

        this.settingsPanel?.mount(this.dom.sidePanelContainer);
    }

    /**
     * Re-render side panel by section key.
     * @param {string} panelKey - Section key.
     * @returns {void}
     */
    renderPanelByKey(panelKey) {
        if (panelKey === 'explorer') {
            this.explorerPanel?.render();
            return;
        }

        if (panelKey === 'siteSetting') {
            this.siteSettingsPanel?.render();
            return;
        }

        this.settingsPanel?.render();
    }

    /**
     * Render tab strip from tab session state.
     * @returns {void}
     */
    renderTabs() {
        if (!this.dom) {
            return;
        }

        const tabs = this.getTabsState();
        const activeId = tabs.activeTabId;
        const markup = tabs.openTabs.map((tab) => {
            const isActive = tab.id === activeId;
            const descriptor = this.describeTab(tab);
            return `
                <button type="button" class="vsb-tab ${isActive ? 'is-active' : ''}" data-tab-id="${this.escapeHtml(tab.id)}">
                    <span class="vsb-tab-icon">${this.escapeHtml(descriptor.icon)}</span>
                    <span class="vsb-tab-title">${this.escapeHtml(descriptor.title)}</span>
                    <span class="vsb-tab-context">${this.escapeHtml(descriptor.context)}</span>
                    <span class="vsb-tab-close" data-close-tab-id="${this.escapeHtml(tab.id)}">x</span>
                </button>
            `;
        }).join('');

        this.dom.tabs.innerHTML = markup;
        this.dom.tabs.querySelectorAll('[data-tab-id]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', (event) => {
                const closeButton = /** @type {HTMLElement | null} */ (event.target instanceof Element ? event.target.closest('[data-close-tab-id]') : null);
                if (closeButton) {
                    const closeTabId = closeButton.getAttribute('data-close-tab-id') || '';
                    if (closeTabId) {
                        this.closeTab(closeTabId);
                    }
                    event.stopPropagation();
                    return;
                }
                const tabId = button.dataset.tabId || '';
                if (tabId) {
                    this.activateTab(tabId);
                }
            });
        });
    }

    /**
     * Describe tab ui labels.
     * @param {{ id: string, kind: "page" | "style" | "script", refId: string, mode?: string }} tab - Tab descriptor.
     * @returns {{ icon: string, title: string, context: string }} Display description.
     */
    describeTab(tab) {
        const state = this.getState();
        if (tab.kind === TAB_KIND.PAGE) {
            const page = state?.resources?.pages?.byId?.[tab.refId] || {};
            const mode = tab.mode === 'graph' || tab.mode === 'both' ? tab.mode : 'view';
            return {
                icon: 'P',
                title: String(page.title || tab.refId),
                context: mode === 'both' ? 'view + graph' : `${mode} mode`,
            };
        }
        if (tab.kind === TAB_KIND.STYLE) {
            const style = state?.resources?.styles?.byId?.[tab.refId] || {};
            return {
                icon: 'S',
                title: String(style.name || tab.refId),
                context: 'style',
            };
        }
        const script = state?.resources?.scripts?.byId?.[tab.refId] || {};
        return {
            icon: 'J',
            title: String(script.name || tab.refId),
            context: 'script',
        };
    }

    /**
     * Render stage content by active tab kind.
     * @param {{ skipFrameRefresh?: boolean }} [options] - Render options.
     * @returns {void}
     */
    renderStage(options = {}) {
        if (!this.dom || !this.iframeRuntime) {
            return;
        }
        const skipFrameRefresh = Boolean(options.skipFrameRefresh);

        const activeTab = this.getActiveTab();
        if (!activeTab) {
            this.closeAddNodePicker();
            this.dom.auxHost.replaceChildren();
            this.dom.root.classList.remove('is-page-tab', 'is-page-both');
            this.dom.root.classList.add('is-no-tools');
            this.dom.pageModeControls.replaceChildren();
            return;
        }

        this.dom.root.classList.toggle('is-page-tab', activeTab.kind === TAB_KIND.PAGE);
        this.dom.root.classList.toggle('is-no-tools', activeTab.kind !== TAB_KIND.PAGE);

        if (activeTab.kind === TAB_KIND.PAGE) {
            this.renderPageStage(activeTab, { skipFrameRefresh });
            return;
        }

        this.closeAddNodePicker();
        this.dom.root.classList.remove('is-page-both');
        this.dom.pageModeControls.replaceChildren();

        if (activeTab.kind === TAB_KIND.STYLE) {
            this.renderStyleStage(activeTab);
            return;
        }

        this.renderScriptStage(activeTab);
    }

    /**
     * Render page stage by page tab mode.
     * @param {{ id: string, kind: "page", refId: string, mode?: string }} tab - Page tab.
     * @param {{ skipFrameRefresh?: boolean }} [options] - Render options.
     * @returns {void}
     */
    renderPageStage(tab, options = {}) {
        if (!this.dom || !this.iframeRuntime) {
            return;
        }
        const skipFrameRefresh = Boolean(options.skipFrameRefresh);

        const mode = tab.mode === 'graph' || tab.mode === 'both' ? tab.mode : 'view';
        this.renderPageModeControls(mode, tab.refId);

        if (mode === 'view') {
            this.dom.root.classList.remove('is-aux-mode', 'is-page-both');
            this.activeStageMountKey = `page:view:${tab.refId}`;
            if (!skipFrameRefresh) {
                this.iframeRuntime.setActivePage(tab.refId);
            }
            return;
        }

        if (mode === 'graph') {
            this.dom.root.classList.remove('is-page-both');
            this.dom.root.classList.add('is-aux-mode');
            if (this.activeStageMountKey !== `page:graph:${tab.refId}`) {
                this.pageGraphPanel?.mount(this.dom.auxHost);
                this.activeStageMountKey = `page:graph:${tab.refId}`;
            }
            this.pageGraphPanel?.setPageId(tab.refId);
            return;
        }

        this.dom.root.classList.remove('is-aux-mode');
        this.dom.root.classList.add('is-page-both');
        if (this.activeStageMountKey !== `page:both:${tab.refId}`) {
            this.pageGraphPanel?.mount(this.dom.auxHost);
            this.activeStageMountKey = `page:both:${tab.refId}`;
        }
        this.pageGraphPanel?.setPageId(tab.refId);
        if (!skipFrameRefresh) {
            this.iframeRuntime.setActivePage(tab.refId);
        }
    }

    /**
     * Render floating page mode and polish controls.
     * @param {'view' | 'graph' | 'both'} mode - Active page mode.
     * @param {string} pageId - Active page id.
     * @returns {void}
     */
    renderPageModeControls(mode, pageId) {
        if (!this.dom) {
            return;
        }

        this.dom.pageModeControls.innerHTML = `
            <div class="vsb-page-mode-group" role="group" aria-label="Page Mode">
                <button type="button" class="vsb-page-mode-btn ${mode === 'view' ? 'is-active' : ''}" data-mode="view">view</button>
                <button type="button" class="vsb-page-mode-btn ${mode === 'graph' ? 'is-active' : ''}" data-mode="graph">graph</button>
                <button type="button" class="vsb-page-mode-btn ${mode === 'both' ? 'is-active' : ''}" data-mode="both">both</button>
            </div>
        `;

        this.dom.pageModeControls.querySelectorAll('[data-mode]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                const nextMode = String(button.dataset.mode || 'view');
                if (nextMode === 'view' || nextMode === 'graph' || nextMode === 'both') {
                    this.setActivePageMode(nextMode);
                }
            });
        });

    }

    /**
     * Render style stage.
     * @param {{ id: string, kind: "style", refId: string }} tab - Style tab.
     * @returns {void}
     */
    renderStyleStage(tab) {
        if (!this.dom) {
            return;
        }

        const style = this.getState()?.resources?.styles?.byId?.[tab.refId];
        this.dom.stageHeaderTitle.textContent = `Style: ${String(style?.name || tab.refId)}`;
        this.dom.root.classList.add('is-aux-mode');
        if (this.activeStageMountKey !== `style:${tab.refId}`) {
            this.styleEditorPanel?.mount(this.dom.auxHost);
            this.activeStageMountKey = `style:${tab.refId}`;
        }
        this.styleEditorPanel?.setStyleId(tab.refId);
    }

    /**
     * Render script stage.
     * @param {{ id: string, kind: "script", refId: string }} tab - Script tab.
     * @returns {void}
     */
    renderScriptStage(tab) {
        if (!this.dom) {
            return;
        }

        const script = this.getState()?.resources?.scripts?.byId?.[tab.refId];
        this.dom.stageHeaderTitle.textContent = `Script: ${String(script?.name || tab.refId)}`;
        this.dom.root.classList.add('is-aux-mode');
        if (this.activeStageMountKey !== `script:${tab.refId}`) {
            this.scriptEditorPanel?.mount(this.dom.auxHost);
            this.activeStageMountKey = `script:${tab.refId}`;
        }
        this.scriptEditorPanel?.setScriptId(tab.refId);
    }

    /**
     * Handle normalized iframe interactions from page runtime.
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
    handleFrameInteraction(payload) {
        const pageId = String(payload.pageId || '').trim();
        if (!pageId) {
            return;
        }

        if (payload.type === 'clear-selection') {
            this.setPageSelection(pageId, []);
            return;
        }

        if (payload.type === 'select') {
            const nodeId = payload.nodeId ? String(payload.nodeId) : '';
            if (!nodeId) {
                this.setPageSelection(pageId, []);
                return;
            }
            this.selectPageNode(pageId, nodeId, Boolean(payload.ctrlKey));
            return;
        }

        if (payload.type === 'select-overlap') {
            const nodeIds = Array.isArray(payload.nodeIds)
                ? payload.nodeIds.map((id) => String(id || '').trim()).filter(Boolean)
                : [];
            if (nodeIds.length > 0) {
                this.setPageSelection(pageId, nodeIds);
            }
            return;
        }

        if (payload.type === 'add') {
            const parentNodeId = payload.nodeId ? String(payload.nodeId) : null;
            this.openAddNodePicker(
                pageId,
                parentNodeId,
                Number(payload.clientX),
                Number(payload.clientY),
            );
            return;
        }

        if (payload.type === 'delete') {
            const nodeId = payload.nodeId ? String(payload.nodeId) : '';
            if (nodeId) {
                this.deleteNode(pageId, nodeId);
            }
            return;
        }

        if (payload.type === 'drop') {
            const targetNodeId = payload.targetNodeId ? String(payload.targetNodeId) : '';
            if (!targetNodeId) {
                return;
            }
            this.reparentSelectedNodes(pageId, targetNodeId, payload.sourceNodeId ? String(payload.sourceNodeId) : null);
            return;
        }

        if (payload.type === 'set-tool-select') {
            this.setPageToolMode(PAGE_TOOL_MODE.SELECT);
            return;
        }

        if (payload.type === 'set-tool-add') {
            this.setPageToolMode(PAGE_TOOL_MODE.ADD);
            return;
        }

        if (payload.type === 'set-tool-delete') {
            this.setPageToolMode(PAGE_TOOL_MODE.DELETE);
            return;
        }

        if (payload.type === 'toggle-delete-mode') {
            this.toggleDeleteMode();
        }
    }

    /**
     * Check whether current selection can be dropped on target node.
     * @param {string} pageId - Active page id.
     * @param {string} targetNodeId - Drop target node id.
     * @param {string | null} sourceNodeId - Drag source node id.
     * @returns {boolean} True when drop is valid.
     */
    canDropSelectionToNode(pageId, targetNodeId, sourceNodeId) {
        const page = this.getState()?.resources?.pages?.byId?.[pageId];
        if (!page || !page?.nodeById?.[targetNodeId]) {
            return false;
        }
        const selectedIds = this.resolveDropSelectionIds(page, sourceNodeId);
        if (selectedIds.length === 0) {
            return false;
        }
        if (selectedIds.includes(targetNodeId)) {
            return false;
        }
        for (const nodeId of selectedIds) {
            if (this.isAncestorInPage(page, nodeId, targetNodeId)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Select node in page with optional multi-toggle behavior.
     * @param {string} pageId - Page id.
     * @param {string} nodeId - Node id.
     * @param {boolean} ctrlKey - Multi-select toggle intent.
     * @returns {void}
     */
    selectPageNode(pageId, nodeId, ctrlKey) {
        if (!nodeId || nodeId === BODY_NODE_ID) {
            this.setPageSelection(pageId, []);
            return;
        }
        if (!this.store) {
            return;
        }
        this.store.update((draft) => {
            const page = draft?.resources?.pages?.byId?.[pageId];
            if (!page || !page?.nodeById?.[nodeId]) {
                return;
            }
            const current = this.normalizeNodeIdArray(page.activeNodeIds)
                .filter((id) => Boolean(page.nodeById?.[id]));
            const next = ctrlKey
                ? (current.includes(nodeId) ? current.filter((id) => id !== nodeId) : current.concat(nodeId))
                : [nodeId];
            page.activeNodeIds = this.normalizeNodeIdArray(next);
            page.activeNodeId = page.activeNodeIds[0] || null;
        });
    }

    /**
     * Set selection list for a page directly.
     * @param {string} pageId - Page id.
     * @param {string[]} nodeIds - Node ids.
     * @returns {void}
     */
    setPageSelection(pageId, nodeIds) {
        if (!this.store) {
            return;
        }
        this.store.update((draft) => {
            const page = draft?.resources?.pages?.byId?.[pageId];
            if (!page) {
                return;
            }
            const valid = this.normalizeNodeIdArray(nodeIds)
                .filter((id) => Boolean(page.nodeById?.[id]));
            page.activeNodeIds = valid;
            page.activeNodeId = valid[0] || null;
        });
    }

    /**
     * Create a new node under parent or as root.
     * @param {string} pageId - Page id.
     * @param {string | null} parentNodeId - Parent node id or null for root.
     * @param {string} [tagName='div'] - Tag name for new node.
     * @param {{ x?: number, y?: number } | null} [graphPosition] - Optional graph position override.
     * @returns {string | null} Created node id.
     */
    createNode(pageId, parentNodeId, tagName = 'div', graphPosition = null) {
        if (!this.store) {
            return null;
        }
        let createdNodeId = null;
        this.store.update((draft) => {
            const page = draft?.resources?.pages?.byId?.[pageId];
            if (!page) {
                return;
            }
            page.rootNodeIds = Array.isArray(page.rootNodeIds) ? page.rootNodeIds : [];
            page.nodeById = page.nodeById && typeof page.nodeById === 'object' ? page.nodeById : {};

            const nextNodeId = this.generateNodeId(page.nodeById);
            const safeParentId = parentNodeId && page.nodeById[parentNodeId] ? parentNodeId : null;
            const parentGraph = safeParentId && page.nodeById[safeParentId]?.graph && typeof page.nodeById[safeParentId].graph === 'object'
                ? page.nodeById[safeParentId].graph
                : null;
            const hasCustomX = Number.isFinite(Number(graphPosition?.x));
            const hasCustomY = Number.isFinite(Number(graphPosition?.y));
            page.nodeById[nextNodeId] = {
                tag: this.normalizeTagName(tagName),
                text: '',
                attrs: {},
                children: [],
                parent: safeParentId,
                graph: {
                    x: hasCustomX
                        ? Number(graphPosition?.x)
                        : (Number.isFinite(Number(parentGraph?.x)) ? Number(parentGraph.x) + 280 : 120),
                    y: hasCustomY
                        ? Number(graphPosition?.y)
                        : (Number.isFinite(Number(parentGraph?.y)) ? Number(parentGraph.y) + 70 : (90 + (page.rootNodeIds.length * 160))),
                    collapsed: false,
                },
            };

            if (safeParentId) {
                const parentNode = page.nodeById[safeParentId];
                parentNode.children = Array.isArray(parentNode.children) ? parentNode.children : [];
                parentNode.children.push(nextNodeId);
            } else {
                page.rootNodeIds.push(nextNodeId);
            }

            this.syncBodyRootNode(page);
            page.activeNodeIds = [nextNodeId];
            page.activeNodeId = nextNodeId;
            createdNodeId = nextNodeId;
        });
        return createdNodeId;
    }

    /**
     * Open add-node picker popup for tag selection.
     * @param {string} pageId - Page id.
     * @param {string | null} parentNodeId - Parent node id or null for root.
     * @param {number} clientX - Frame-local pointer x coordinate.
     * @param {number} clientY - Frame-local pointer y coordinate.
     * @returns {void}
     */
    openAddNodePicker(pageId, parentNodeId, clientX, clientY) {
        if (!this.dom) {
            return;
        }
        this.closeAddNodePicker();

        const menu = document.createElement('div');
        menu.className = 'vsb-node-menu';
        menu.setAttribute('data-role', 'node-menu');
        menu.innerHTML = `
            <div class="vsb-node-menu-head">Add Node</div>
            <div class="vsb-node-menu-target">target: ${this.escapeHtml(parentNodeId ? parentNodeId : 'body')}</div>
            ${ADDABLE_TAG_GROUPS.map((group) => `
                <div class="vsb-node-menu-section">${this.escapeHtml(group.title)}</div>
                <div class="vsb-node-menu-rule"></div>
                <div class="vsb-node-menu-list">
                    ${group.tags.map((tag) => `<button type="button" class="vsb-node-menu-item" data-role="pick-tag" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</button>`).join('')}
                </div>
            `).join('')}
            <div class="vsb-node-menu-rule"></div>
            <button type="button" class="vsb-node-menu-item is-cancel" data-role="picker-close">cancel</button>
        `;

        const choose = (tag) => {
            this.createNode(pageId, parentNodeId, tag);
            this.closeAddNodePicker();
        };

        menu.querySelectorAll('[data-role="pick-tag"]').forEach((node) => {
            const button = /** @type {HTMLButtonElement} */ (node);
            button.addEventListener('click', () => {
                choose(String(button.dataset.tag || 'div'));
            });
        });

        const onWindowPointerDown = (event) => {
            if (!menu.contains(/** @type {Node} */ (event.target))) {
                this.closeAddNodePicker();
            }
        };

        menu.querySelector('[data-role="picker-close"]')?.addEventListener('click', () => {
            this.closeAddNodePicker();
        });

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeAddNodePicker();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('pointerdown', onWindowPointerDown, true);

        const rootRect = this.dom.root.getBoundingClientRect();
        const frameRect = this.dom.iframeHost.getBoundingClientRect();
        const safeX = Number.isFinite(clientX) ? clientX : 24;
        const safeY = Number.isFinite(clientY) ? clientY : 24;
        const anchorLeft = frameRect.left - rootRect.left + safeX;
        const anchorTop = frameRect.top - rootRect.top + safeY;
        menu.style.left = `${anchorLeft}px`;
        menu.style.top = `${anchorTop}px`;
        this.dom.root.appendChild(menu);

        const menuRect = menu.getBoundingClientRect();
        const maxLeft = Math.max(8, rootRect.width - menuRect.width - 8);
        const maxTop = Math.max(8, rootRect.height - menuRect.height - 8);
        const clampedLeft = Math.min(Math.max(8, anchorLeft), maxLeft);
        const clampedTop = Math.min(Math.max(8, anchorTop), maxTop);
        menu.style.left = `${clampedLeft}px`;
        menu.style.top = `${clampedTop}px`;

        this.addNodePickerCleanup = () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('pointerdown', onWindowPointerDown, true);
            menu.remove();
        };
    }

    /**
     * Close add-node picker popup if open.
     * @returns {void}
     */
    closeAddNodePicker() {
        this.addNodePickerCleanup?.();
        this.addNodePickerCleanup = null;
    }

    /**
     * Update node tag/text/attrs in page model.
     * @param {string} pageId - Page id.
     * @param {string} nodeId - Node id.
     * @param {{ tag?: string, text?: string, attrs?: Record<string, string> }} patch - Node patch.
     * @returns {void}
     */
    updatePageNode(pageId, nodeId, patch) {
        if (nodeId === BODY_NODE_ID) {
            return;
        }
        if (!this.store) {
            return;
        }
        this.store.update((draft) => {
            const page = draft?.resources?.pages?.byId?.[pageId];
            const node = page?.nodeById?.[nodeId];
            if (!page || !node) {
                return;
            }

            if (typeof patch.tag === 'string' && patch.tag.trim()) {
                node.tag = this.normalizeTagName(patch.tag);
            }

            if (typeof patch.text === 'string') {
                const children = Array.isArray(node.children) ? node.children : [];
                if (children.length === 0) {
                    node.text = patch.text;
                }
            }

            if (patch.attrs && typeof patch.attrs === 'object') {
                node.attrs = Object.fromEntries(
                    Object.entries(patch.attrs)
                        .map((entry) => [String(entry[0] || '').trim(), String(entry[1] ?? '')])
                        .filter((entry) => entry[0] && !entry[0].startsWith('_')),
                );
            }
        });
    }

    /**
     * Update node graph metadata.
     * @param {string} pageId - Page id.
     * @param {string} nodeId - Node id.
     * @param {{ x?: number, y?: number, collapsed?: boolean }} graphPatch - Graph patch.
     * @returns {void}
     */
    updateNodeGraph(pageId, nodeId, graphPatch) {
        if (!this.store || !nodeId || nodeId === BODY_NODE_ID) {
            return;
        }
        this.skipNextFrameRefresh = true;
        this.store.update((draft) => {
            const node = draft?.resources?.pages?.byId?.[pageId]?.nodeById?.[nodeId];
            if (!node || typeof node !== 'object') {
                return;
            }
            node.graph = node.graph && typeof node.graph === 'object' ? node.graph : {};
            if (Number.isFinite(Number(graphPatch?.x))) {
                node.graph.x = Number(graphPatch.x);
            }
            if (Number.isFinite(Number(graphPatch?.y))) {
                node.graph.y = Number(graphPatch.y);
            }
            if (typeof graphPatch?.collapsed === 'boolean') {
                node.graph.collapsed = graphPatch.collapsed;
            }
        });
    }

    /**
     * Reparent a single node to another node or root.
     * @param {string} pageId - Page id.
     * @param {string} nodeId - Source node id.
     * @param {string | null} targetParentId - Target parent node id or null for root/body.
     * @returns {boolean} True when reparent operation succeeded.
     */
    reparentNode(pageId, nodeId, targetParentId) {
        if (!this.store || !nodeId || nodeId === BODY_NODE_ID) {
            return false;
        }

        let changed = false;
        this.store.update((draft) => {
            const page = draft?.resources?.pages?.byId?.[pageId];
            if (!page || !page?.nodeById?.[nodeId]) {
                return;
            }

            const targetId = targetParentId && targetParentId !== BODY_NODE_ID
                ? String(targetParentId)
                : null;
            if (targetId && !page.nodeById[targetId]) {
                return;
            }
            if (targetId === nodeId) {
                return;
            }
            if (targetId && this.isAncestorInPage(page, nodeId, targetId)) {
                return;
            }

            const currentParent = this.findParentNodeId(page, nodeId);
            if ((currentParent || null) === (targetId || null)) {
                return;
            }

            this.detachNodeReferences(page, nodeId);
            if (targetId) {
                const parentNode = page.nodeById[targetId];
                parentNode.children = Array.isArray(parentNode.children) ? parentNode.children : [];
                if (!parentNode.children.includes(nodeId)) {
                    parentNode.children.push(nodeId);
                }
                page.nodeById[nodeId].parent = targetId;
            } else {
                page.rootNodeIds = Array.isArray(page.rootNodeIds) ? page.rootNodeIds : [];
                if (!page.rootNodeIds.includes(nodeId)) {
                    page.rootNodeIds.push(nodeId);
                }
                page.nodeById[nodeId].parent = null;
            }

            this.syncBodyRootNode(page);
            changed = true;
        });

        return changed;
    }

    /**
     * Reorder a direct child inside a parent node children list.
     * @param {string} pageId - Page id.
     * @param {string} parentNodeId - Parent node id.
     * @param {string} childNodeId - Child node id.
     * @param {'up' | 'down'} direction - Reorder direction.
     * @returns {void}
     */
    reorderNodeChild(pageId, parentNodeId, childNodeId, direction) {
        if (!this.store || !parentNodeId || !childNodeId) {
            return;
        }
        this.store.update((draft) => {
            const page = draft?.resources?.pages?.byId?.[pageId];
            const parentNode = page?.nodeById?.[parentNodeId];
            if (!page || !parentNode) {
                return;
            }
            const children = Array.isArray(parentNode.children) ? parentNode.children : [];
            const index = children.indexOf(childNodeId);
            if (index < 0) {
                return;
            }
            const nextIndex = direction === 'up' ? index - 1 : index + 1;
            if (nextIndex < 0 || nextIndex >= children.length) {
                return;
            }
            const temp = children[index];
            children[index] = children[nextIndex];
            children[nextIndex] = temp;
            parentNode.children = children;
            this.syncBodyRootNode(page);
        });
    }

    /**
     * Auto-arrange graph node positions in a left-to-right tree layout.
     * @param {string} pageId - Page id.
     * @returns {void}
     */
    polishGraph(pageId) {
        if (!this.store) {
            return;
        }
        this.store.update((draft) => {
            const page = draft?.resources?.pages?.byId?.[pageId];
            if (!page) {
                return;
            }
            const nodeById = page.nodeById && typeof page.nodeById === 'object' ? page.nodeById : {};
            const roots = (Array.isArray(page.rootNodeIds) ? page.rootNodeIds : [])
                .map((id) => String(id || ''))
                .filter((id) => id && id !== BODY_NODE_ID && nodeById[id]);
            let cursorY = 0;
            const visited = new Set();

            /**
             * Compute tree row placement for a node branch.
             * @param {string} currentId - Node id.
             * @param {number} depth - Depth from root.
             * @returns {number} Assigned y coordinate.
             */
            const place = (currentId, depth) => {
                const id = String(currentId || '');
                if (!id || id === BODY_NODE_ID || !nodeById[id]) {
                    const y = 90 + (cursorY * 170);
                    cursorY += 1;
                    return y;
                }
                if (visited.has(id)) {
                    const fallbackY = Number(nodeById[id]?.graph?.y);
                    return Number.isFinite(fallbackY) ? fallbackY : (90 + (cursorY * 170));
                }
                visited.add(id);
                const node = nodeById[id];
                const children = Array.isArray(node.children)
                    ? node.children.map((childId) => String(childId || '')).filter((childId) => childId && childId !== BODY_NODE_ID && nodeById[childId])
                    : [];

                /** @type {number[]} */
                const childY = [];
                children.forEach((childId) => {
                    childY.push(place(childId, depth + 1));
                });

                let y = 0;
                if (childY.length === 0) {
                    y = 90 + (cursorY * 170);
                    cursorY += 1;
                } else {
                    y = childY.reduce((acc, value) => acc + value, 0) / childY.length;
                }

                node.graph = node.graph && typeof node.graph === 'object' ? node.graph : {};
                node.graph.x = 90 + (depth * 300);
                node.graph.y = y;
                node.graph.collapsed = Boolean(node.graph.collapsed);
                return y;
            };

            roots.forEach((rootId) => {
                place(rootId, 0);
            });

            Object.keys(nodeById).forEach((nodeId) => {
                if (nodeId !== BODY_NODE_ID && !visited.has(nodeId)) {
                    place(nodeId, 0);
                }
            });
        });
    }

    /**
     * Delete a node based on active delete mode.
     * @param {string} pageId - Page id.
     * @param {string} nodeId - Node id.
     * @returns {void}
     */
    deleteNode(pageId, nodeId) {
        if (!nodeId || nodeId === BODY_NODE_ID) {
            return;
        }
        const deleteMode = this.getPageToolState().deleteMode;
        if (deleteMode === DELETE_MODE.BRANCH) {
            this.deleteNodeBranch(pageId, nodeId);
            return;
        }
        this.deleteNodeSingle(pageId, nodeId);
    }

    /**
     * Delete one node and keep its children (reparent children to node parent/root).
     * @param {string} pageId - Page id.
     * @param {string} nodeId - Node id.
     * @returns {void}
     */
    deleteNodeSingle(pageId, nodeId) {
        if (!this.store) {
            return;
        }
        this.store.update((draft) => {
            const page = draft?.resources?.pages?.byId?.[pageId];
            const node = page?.nodeById?.[nodeId];
            if (!page || !node) {
                return;
            }
            page.rootNodeIds = Array.isArray(page.rootNodeIds) ? page.rootNodeIds : [];
            const children = Array.isArray(node.children) ? node.children.filter((id) => Boolean(page.nodeById?.[id])) : [];
            const parentId = this.findParentNodeId(page, nodeId);

            if (parentId && page.nodeById[parentId]) {
                const parentNode = page.nodeById[parentId];
                parentNode.children = Array.isArray(parentNode.children) ? parentNode.children : [];
                const index = parentNode.children.indexOf(nodeId);
                if (index >= 0) {
                    parentNode.children.splice(index, 1, ...children);
                } else {
                    parentNode.children.push(...children);
                }
                children.forEach((childId) => {
                    const child = page.nodeById?.[childId];
                    if (child) {
                        child.parent = parentId;
                    }
                });
            } else {
                const rootIndex = page.rootNodeIds.indexOf(nodeId);
                if (rootIndex >= 0) {
                    page.rootNodeIds.splice(rootIndex, 1, ...children);
                } else {
                    page.rootNodeIds.push(...children);
                }
                children.forEach((childId) => {
                    const child = page.nodeById?.[childId];
                    if (child) {
                        child.parent = null;
                    }
                });
            }

            this.detachNodeReferences(page, nodeId);
            delete page.nodeById[nodeId];
            this.syncBodyRootNode(page);
            page.activeNodeIds = this.normalizeNodeIdArray(page.activeNodeIds).filter((id) => id !== nodeId && Boolean(page.nodeById?.[id]));
            page.activeNodeId = page.activeNodeIds[0] || null;
        });
    }

    /**
     * Delete a full node branch including all descendants.
     * @param {string} pageId - Page id.
     * @param {string} nodeId - Root node to delete.
     * @returns {void}
     */
    deleteNodeBranch(pageId, nodeId) {
        if (!this.store) {
            return;
        }
        this.store.update((draft) => {
            const page = draft?.resources?.pages?.byId?.[pageId];
            const rootNode = page?.nodeById?.[nodeId];
            if (!page || !rootNode) {
                return;
            }
            const branchIds = this.collectBranchNodeIds(page, nodeId);
            const branchSet = new Set(branchIds);
            const parentId = this.findParentNodeId(page, nodeId);

            if (parentId && page.nodeById[parentId]) {
                const parentNode = page.nodeById[parentId];
                parentNode.children = Array.isArray(parentNode.children) ? parentNode.children : [];
                parentNode.children = parentNode.children.filter((childId) => childId !== nodeId);
            } else {
                page.rootNodeIds = Array.isArray(page.rootNodeIds) ? page.rootNodeIds : [];
                page.rootNodeIds = page.rootNodeIds.filter((id) => id !== nodeId);
            }

            branchIds.forEach((branchNodeId) => {
                this.detachNodeReferences(page, branchNodeId);
                delete page.nodeById[branchNodeId];
            });

            Object.values(page.nodeById || {}).forEach((node) => {
                if (!node || typeof node !== 'object') {
                    return;
                }
                if (Array.isArray(node.children)) {
                    node.children = node.children.filter((id) => !branchSet.has(id));
                }
                if (typeof node.parent === 'string' && branchSet.has(node.parent)) {
                    node.parent = null;
                }
            });

            this.syncBodyRootNode(page);
            page.activeNodeIds = this.normalizeNodeIdArray(page.activeNodeIds)
                .filter((id) => !branchSet.has(id) && Boolean(page.nodeById?.[id]));
            page.activeNodeId = page.activeNodeIds[0] || null;
        });
    }

    /**
     * Reparent selected nodes to a new parent when valid.
     * @param {string} pageId - Page id.
     * @param {string} targetNodeId - New parent node id.
     * @param {string | null} sourceNodeId - Source node id from drag payload.
     * @returns {void}
     */
    reparentSelectedNodes(pageId, targetNodeId, sourceNodeId) {
        if (!this.store) {
            return;
        }
        this.store.update((draft) => {
            const page = draft?.resources?.pages?.byId?.[pageId];
            if (!page || !page?.nodeById?.[targetNodeId]) {
                return;
            }
            const selectedIds = this.resolveDropSelectionIds(page, sourceNodeId);
            if (selectedIds.length === 0) {
                return;
            }
            if (selectedIds.includes(targetNodeId)) {
                return;
            }
            for (const nodeId of selectedIds) {
                if (this.isAncestorInPage(page, nodeId, targetNodeId)) {
                    return;
                }
            }

            const moveRoots = selectedIds.filter((nodeId) => (
                !selectedIds.some((candidateId) => candidateId !== nodeId && this.isAncestorInPage(page, candidateId, nodeId))
            ));
            const targetNode = page.nodeById[targetNodeId];
            targetNode.children = Array.isArray(targetNode.children) ? targetNode.children : [];

            moveRoots.forEach((nodeId) => {
                this.detachNodeReferences(page, nodeId);
            });

            moveRoots.forEach((nodeId) => {
                targetNode.children.push(nodeId);
                const node = page.nodeById[nodeId];
                if (node && typeof node === 'object') {
                    node.parent = targetNodeId;
                }
            });

            this.syncBodyRootNode(page);
            page.activeNodeIds = moveRoots;
            page.activeNodeId = moveRoots[0] || null;
        });
    }

    /**
     * Resolve effective selection for drop operations.
     * @param {any} page - Page object.
     * @param {string | null} sourceNodeId - Drag source fallback.
     * @returns {string[]} Node ids to move.
     */
    resolveDropSelectionIds(page, sourceNodeId) {
        const selected = this.normalizeNodeIdArray(page?.activeNodeIds)
            .filter((id) => Boolean(page?.nodeById?.[id]));
        if (selected.length > 0) {
            return selected;
        }
        if (sourceNodeId && page?.nodeById?.[sourceNodeId]) {
            return [sourceNodeId];
        }
        return [];
    }

    /**
     * Collect all node ids in a branch.
     * @param {any} page - Page object.
     * @param {string} rootNodeId - Branch root node id.
     * @returns {string[]} Branch node ids.
     */
    collectBranchNodeIds(page, rootNodeId) {
        /** @type {string[]} */
        const result = [];
        /** @type {string[]} */
        const stack = [rootNodeId];
        while (stack.length > 0) {
            const current = String(stack.pop() || '');
            if (!current || result.includes(current) || !page?.nodeById?.[current]) {
                continue;
            }
            result.push(current);
            const children = Array.isArray(page.nodeById[current]?.children) ? page.nodeById[current].children : [];
            children.forEach((childId) => {
                stack.push(String(childId));
            });
        }
        return result;
    }

    /**
     * Check whether ancestorId is an ancestor of descendantId in a page tree.
     * @param {any} page - Page object.
     * @param {string} ancestorId - Candidate ancestor node id.
     * @param {string} descendantId - Candidate descendant node id.
     * @returns {boolean} True when ancestor relationship exists.
     */
    isAncestorInPage(page, ancestorId, descendantId) {
        if (ancestorId === descendantId) {
            return true;
        }
        let current = this.findParentNodeId(page, descendantId);
        while (current) {
            if (current === ancestorId) {
                return true;
            }
            current = this.findParentNodeId(page, current);
        }
        return false;
    }

    /**
     * Find parent node id for a node.
     * @param {any} page - Page object.
     * @param {string} nodeId - Node id.
     * @returns {string | null} Parent id when found.
     */
    findParentNodeId(page, nodeId) {
        if (nodeId === BODY_NODE_ID) {
            return null;
        }
        const directParent = page?.nodeById?.[nodeId]?.parent;
        if (typeof directParent === 'string' && directParent && directParent !== BODY_NODE_ID && page?.nodeById?.[directParent]) {
            return directParent;
        }

        for (const [candidateId, candidate] of Object.entries(page?.nodeById || {})) {
            if (candidateId === BODY_NODE_ID) {
                continue;
            }
            const children = Array.isArray(candidate?.children) ? candidate.children : [];
            if (children.includes(nodeId)) {
                return String(candidateId);
            }
        }
        return null;
    }

    /**
     * Keep virtual body node synced with top-level root ids.
     * @param {any} page - Page object.
     * @returns {void}
     */
    syncBodyRootNode(page) {
        if (!page || typeof page !== 'object') {
            return;
        }
        page.rootNodeIds = Array.isArray(page.rootNodeIds) ? page.rootNodeIds.filter((id) => id && id !== BODY_NODE_ID) : [];
        page.nodeById = page.nodeById && typeof page.nodeById === 'object' ? page.nodeById : {};
        const previous = page.nodeById[BODY_NODE_ID] && typeof page.nodeById[BODY_NODE_ID] === 'object'
            ? page.nodeById[BODY_NODE_ID]
            : {};
        page.nodeById[BODY_NODE_ID] = {
            ...previous,
            tag: 'body',
            parent: null,
            text: '',
            attrs: previous.attrs && typeof previous.attrs === 'object' ? previous.attrs : {},
            children: page.rootNodeIds.slice(),
            _virtualRoot: true,
        };
    }

    /**
     * Remove node references from parent and root containers.
     * @param {any} page - Page object.
     * @param {string} nodeId - Node id.
     * @returns {void}
     */
    detachNodeReferences(page, nodeId) {
        if (!page || typeof page !== 'object') {
            return;
        }
        page.rootNodeIds = Array.isArray(page.rootNodeIds) ? page.rootNodeIds.filter((id) => id !== nodeId) : [];
        Object.values(page.nodeById || {}).forEach((candidate) => {
            if (!candidate || typeof candidate !== 'object') {
                return;
            }
            if (Array.isArray(candidate.children)) {
                candidate.children = candidate.children.filter((childId) => childId !== nodeId);
            }
        });
    }

    /**
     * Normalize unknown value into unique non-empty node id list.
     * @param {unknown} value - Candidate node id list.
     * @returns {string[]} Normalized node id list.
     */
    normalizeNodeIdArray(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        return Array.from(new Set(value
            .map((id) => String(id || '').trim())
            .filter((id) => Boolean(id) && id !== BODY_NODE_ID)));
    }

    /**
     * Normalize tag input for node mutation.
     * @param {string} tagName - Raw tag name.
     * @returns {string} Sanitized tag name.
     */
    normalizeTagName(tagName) {
        const normalized = String(tagName || '').trim().toLowerCase();
        if (!/^[a-z][a-z0-9-]*$/.test(normalized)) {
            return 'div';
        }
        return normalized;
    }

    /**
     * Generate next unique node id for a page.
     * @param {Record<string, any>} nodeById - Existing node map.
     * @returns {string} New node id.
     */
    generateNodeId(nodeById) {
        let index = 1;
        while (nodeById[`n_${index}`] || nodeById[`n${index}`]) {
            index += 1;
        }
        return `n_${index}`;
    }

    /**
     * Resolve active page id from active page tab or start page.
     * @returns {string | null} Active page id.
     */
    getActivePageId() {
        const activeTab = this.getActiveTab();
        if (activeTab && activeTab.kind === TAB_KIND.PAGE) {
            return activeTab.refId;
        }
        return this.getState()?.resources?.pages?.startPageId || this.getFirstPageId();
    }

    /**
     * Get first page id from state order.
     * @returns {string | null} First page id.
     */
    getFirstPageId() {
        const order = this.getState()?.resources?.pages?.order;
        if (!Array.isArray(order) || order.length === 0) {
            return null;
        }
        return String(order[0]);
    }

    /**
     * Update domain label with policy validation.
     * @param {string} label - Raw label.
     * @returns {void}
     */
    updateDomain(label) {
        if (!this.store) {
            return;
        }

        const normalized = DomainPolicy.normalizeLabel(label);
        const validation = DomainPolicy.validateLabel(normalized);
        this.domainError = validation.ok ? null : validation.message;

        this.store.update((draft) => {
            draft.project ||= {};
            draft.project.domain = DomainPolicy.buildDomain(normalized);
        });
    }

    /**
     * Update page fields.
     * @param {string} pageId - Page id.
     * @param {{
     *   title?: string,
     *   slug?: string,
     *   meta?: { seoTitle?: string, seoDescription?: string, visibility?: string },
     *   includes?: { styleIds?: string[], scriptIds?: string[] }
     * }} patch - Page patch.
     * @returns {void}
     */
    updatePage(pageId, patch) {
        if (!this.store) {
            return;
        }
        this.store.update((draft) => {
            const page = draft?.resources?.pages?.byId?.[pageId];
            if (!page) {
                return;
            }
            if (typeof patch.title === 'string' && patch.title.trim()) {
                page.title = patch.title.trim();
            }
            if (typeof patch.slug === 'string' && patch.slug.trim()) {
                page.slug = patch.slug.trim();
            }
            page.meta ||= {
                seoTitle: page.title || '',
                seoDescription: '',
                visibility: 'public',
            };
            if (patch.meta && typeof patch.meta === 'object') {
                if (typeof patch.meta.seoTitle === 'string') {
                    page.meta.seoTitle = patch.meta.seoTitle;
                }
                if (typeof patch.meta.seoDescription === 'string') {
                    page.meta.seoDescription = patch.meta.seoDescription;
                }
                if (typeof patch.meta.visibility === 'string' && patch.meta.visibility) {
                    page.meta.visibility = patch.meta.visibility;
                }
            }

            if (patch.includes && typeof patch.includes === 'object') {
                page.includes ||= { styleIds: [], scriptIds: [] };
                if (Array.isArray(patch.includes.styleIds)) {
                    page.includes.styleIds = Array.from(new Set(patch.includes.styleIds
                        .map((id) => String(id || '').trim())
                        .filter(Boolean)));
                }
                if (Array.isArray(patch.includes.scriptIds)) {
                    page.includes.scriptIds = Array.from(new Set(patch.includes.scriptIds
                        .map((id) => String(id || '').trim())
                        .filter(Boolean)));
                }
            }
        });
    }

    /**
     * Rename page title from explorer.
     * @param {string} pageId - Page id.
     * @param {string} nextTitle - Next page title.
     * @returns {void}
     */
    renamePage(pageId, nextTitle) {
        const title = String(nextTitle || '').trim();
        if (!title) {
            return;
        }
        this.updatePage(pageId, { title });
    }

    /**
     * Set start page in project state.
     * @param {string} pageId - Page id.
     * @returns {void}
     */
    setStartPage(pageId) {
        if (!this.store) {
            return;
        }
        this.store.update((draft) => {
            draft.resources ||= {};
            draft.resources.pages ||= {};
            draft.resources.pages.startPageId = pageId;
        });
        this.openPageTab(pageId, { activate: true });
    }

    /**
     * Create new page with defaults.
     * @returns {void}
     */
    createPage() {
        if (!this.store) {
            return;
        }

        let nextId = '';
        this.store.update((draft) => {
            draft.resources ||= {};
            draft.resources.pages ||= { startPageId: null, order: [], byId: {} };
            draft.resources.pages.order ||= [];
            draft.resources.pages.byId ||= {};

            nextId = this.generatePageId(draft.resources.pages.byId);
            draft.resources.pages.byId[nextId] = {
                id: nextId,
                title: `New Page ${draft.resources.pages.order.length + 1}`,
                slug: `new-page-${draft.resources.pages.order.length + 1}`,
                meta: {
                    seoTitle: 'New Page',
                    seoDescription: '',
                    visibility: 'public',
                },
                rootNodeIds: [],
                nodeById: {},
                includes: {
                    styleIds: [],
                    scriptIds: [],
                },
                activeNodeId: null,
                activeNodeIds: [],
            };
            this.syncBodyRootNode(draft.resources.pages.byId[nextId]);
            draft.resources.pages.order.push(nextId);
            draft.resources.pages.startPageId ||= nextId;
        });

        if (nextId) {
            this.openPageTab(nextId, { activate: true });
        }
    }

    /**
     * Duplicate a page.
     * @param {string} sourcePageId - Source page id.
     * @returns {void}
     */
    duplicatePage(sourcePageId) {
        if (!this.store) {
            return;
        }

        let nextId = '';
        this.store.update((draft) => {
            const source = draft?.resources?.pages?.byId?.[sourcePageId];
            if (!source) {
                return;
            }
            draft.resources.pages.order ||= [];
            draft.resources.pages.byId ||= {};
            nextId = this.generatePageId(draft.resources.pages.byId);
            const copy = deepClone(source);
            copy.id = nextId;
            copy.title = `${String(copy.title || 'Page')} Copy`;
            copy.slug = this.ensureUniqueSlug(String(copy.slug || 'page-copy'), draft.resources.pages.byId);
            this.syncBodyRootNode(copy);
            draft.resources.pages.byId[nextId] = copy;
            draft.resources.pages.order.push(nextId);
        });

        if (nextId) {
            this.openPageTab(nextId, { activate: true });
        }
    }

    /**
     * Delete page and related tabs.
     * @param {string} pageId - Page id.
     * @returns {void}
     */
    deletePage(pageId) {
        if (!this.store) {
            return;
        }

        this.store.update((draft) => {
            const pages = draft?.resources?.pages?.byId || {};
            const order = draft?.resources?.pages?.order || [];
            if (!pages[pageId]) {
                return;
            }

            delete pages[pageId];
            draft.resources.pages.order = order.filter((id) => id !== pageId);
            if (draft.resources.pages.startPageId === pageId) {
                draft.resources.pages.startPageId = draft.resources.pages.order[0] || null;
            }

            const tabs = draft?.editor?.tabs;
            if (tabs && Array.isArray(tabs.openTabs)) {
                tabs.openTabs = tabs.openTabs.filter((tab) => !(tab.kind === TAB_KIND.PAGE && tab.refId === pageId));
                if (!tabs.openTabs.some((tab) => tab.id === tabs.activeTabId)) {
                    tabs.activeTabId = tabs.openTabs[0] ? tabs.openTabs[0].id : null;
                }
            }
        });

        this.ensureInitialTab();
    }

    /**
     * Update style resource object.
     * @param {string} styleId - Style id.
     * @param {any} nextStyle - Next style object.
     * @returns {void}
     */
    updateStyle(styleId, nextStyle) {
        if (!this.store) {
            return;
        }
        this.store.update((draft) => {
            draft.resources ||= {};
            draft.resources.styles ||= {};
            draft.resources.styles.byId ||= {};
            if (!draft.resources.styles.byId[styleId]) {
                return;
            }
            const safe = deepClone(nextStyle || {});
            safe.id = styleId;
            safe.name = String(safe.name || draft.resources.styles.byId[styleId].name || styleId);
            safe.rules = Array.isArray(safe.rules) ? safe.rules : [];
            draft.resources.styles.byId[styleId] = safe;
        });
    }

    /**
     * Rename style resource.
     * @param {string} styleId - Style id.
     * @param {string} nextName - Next style display name.
     * @returns {void}
     */
    renameStyle(styleId, nextName) {
        if (!this.store) {
            return;
        }
        const safeName = String(nextName || '').trim();
        if (!safeName) {
            return;
        }
        this.store.update((draft) => {
            const style = draft?.resources?.styles?.byId?.[styleId];
            if (!style) {
                return;
            }
            style.name = safeName;
        });
    }

    /**
     * Update script resource object.
     * @param {string} scriptId - Script id.
     * @param {any} nextScript - Next script object.
     * @returns {void}
     */
    updateScript(scriptId, nextScript) {
        if (!this.store) {
            return;
        }
        this.store.update((draft) => {
            draft.resources ||= {};
            draft.resources.scripts ||= {};
            draft.resources.scripts.byId ||= {};
            if (!draft.resources.scripts.byId[scriptId]) {
                return;
            }
            const safe = deepClone(nextScript || {});
            safe.id = scriptId;
            safe.name = String(safe.name || draft.resources.scripts.byId[scriptId].name || scriptId);
            safe.variables = safe.variables && typeof safe.variables === 'object' ? safe.variables : {};
            safe.actions = safe.actions && typeof safe.actions === 'object' ? safe.actions : {};
            safe.events = safe.events && typeof safe.events === 'object' ? safe.events : {};
            draft.resources.scripts.byId[scriptId] = safe;
        });
    }

    /**
     * Rename script resource.
     * @param {string} scriptId - Script id.
     * @param {string} nextName - Next script display name.
     * @returns {void}
     */
    renameScript(scriptId, nextName) {
        if (!this.store) {
            return;
        }
        const safeName = String(nextName || '').trim();
        if (!safeName) {
            return;
        }
        this.store.update((draft) => {
            const script = draft?.resources?.scripts?.byId?.[scriptId];
            if (!script) {
                return;
            }
            script.name = safeName;
        });
    }

    /**
     * Create a new style resource.
     * @returns {void}
     */
    createStyle() {
        if (!this.store) {
            return;
        }
        let styleId = '';
        this.store.update((draft) => {
            draft.resources ||= {};
            draft.resources.styles ||= {};
            draft.resources.styles.byId ||= {};
            styleId = this.generateResourceId(draft.resources.styles.byId, 'st');
            const name = this.createUniqueResourceName(
                Object.values(draft.resources.styles.byId).map((style) => String(style.name || '')),
                'new-style',
            );
            draft.resources.styles.byId[styleId] = {
                id: styleId,
                name,
                rules: [],
            };
        });
        if (styleId) {
            this.openStyleTab(styleId, { activate: true });
        }
    }

    /**
     * Delete a style resource and remove all references.
     * @param {string} styleId - Style id.
     * @returns {void}
     */
    deleteStyle(styleId) {
        if (!this.store) {
            return;
        }

        this.store.update((draft) => {
            const styles = draft?.resources?.styles?.byId || {};
            if (!styles[styleId]) {
                return;
            }
            delete styles[styleId];

            Object.values(draft?.resources?.pages?.byId || {}).forEach((page) => {
                if (!page || typeof page !== 'object') {
                    return;
                }
                page.includes ||= { styleIds: [], scriptIds: [] };
                page.includes.styleIds = Array.isArray(page.includes.styleIds)
                    ? page.includes.styleIds.filter((id) => id !== styleId)
                    : [];
            });

            const tabs = draft?.editor?.tabs;
            if (tabs && Array.isArray(tabs.openTabs)) {
                tabs.openTabs = tabs.openTabs.filter((tab) => !(tab.kind === TAB_KIND.STYLE && tab.refId === styleId));
                if (!tabs.openTabs.some((tab) => tab.id === tabs.activeTabId)) {
                    tabs.activeTabId = tabs.openTabs[0] ? tabs.openTabs[0].id : null;
                }
            }
        });

        this.ensureInitialTab();
    }

    /**
     * Create a new script resource.
     * @returns {void}
     */
    createScript() {
        if (!this.store) {
            return;
        }
        let scriptId = '';
        this.store.update((draft) => {
            draft.resources ||= {};
            draft.resources.scripts ||= {};
            draft.resources.scripts.byId ||= {};
            scriptId = this.generateResourceId(draft.resources.scripts.byId, 'sc');
            const name = this.createUniqueResourceName(
                Object.values(draft.resources.scripts.byId).map((script) => String(script.name || '')),
                'new-script',
            );
            draft.resources.scripts.byId[scriptId] = {
                id: scriptId,
                name,
                variables: {},
                actions: {},
                events: {},
            };
        });
        if (scriptId) {
            this.openScriptTab(scriptId, { activate: true });
        }
    }

    /**
     * Delete a script resource and remove all references.
     * @param {string} scriptId - Script id.
     * @returns {void}
     */
    deleteScript(scriptId) {
        if (!this.store) {
            return;
        }

        this.store.update((draft) => {
            const scripts = draft?.resources?.scripts?.byId || {};
            if (!scripts[scriptId]) {
                return;
            }
            delete scripts[scriptId];

            Object.values(draft?.resources?.pages?.byId || {}).forEach((page) => {
                if (!page || typeof page !== 'object') {
                    return;
                }
                page.includes ||= { styleIds: [], scriptIds: [] };
                page.includes.scriptIds = Array.isArray(page.includes.scriptIds)
                    ? page.includes.scriptIds.filter((id) => id !== scriptId)
                    : [];
            });

            const tabs = draft?.editor?.tabs;
            if (tabs && Array.isArray(tabs.openTabs)) {
                tabs.openTabs = tabs.openTabs.filter((tab) => !(tab.kind === TAB_KIND.SCRIPT && tab.refId === scriptId));
                if (!tabs.openTabs.some((tab) => tab.id === tabs.activeTabId)) {
                    tabs.activeTabId = tabs.openTabs[0] ? tabs.openTabs[0].id : null;
                }
            }
        });

        this.ensureInitialTab();
    }

    /**
     * Apply active theme to root element and persist theme state.
     * @returns {void}
     */
    applyTheme() {
        if (!this.dom || !this.themeRegistry || !this.store) {
            return;
        }

        const activeTheme = this.themeRegistry.getActiveTheme();
        const fallbackTheme = this.themeRegistry.getTheme('default-dark') || activeTheme;
        ThemeApplier.apply(this.dom.root, activeTheme, fallbackTheme);
        this.persistThemeState();
    }

    /**
     * Register a custom theme object.
     * @param {unknown} themeObject - Custom theme payload.
     * @returns {{ ok: boolean, errors: string[], themeId: string | null }} Registration result.
     */
    registerTheme(themeObject) {
        if (!this.themeRegistry) {
            return { ok: false, errors: ['Theme registry is not initialized.'], themeId: null };
        }

        const result = this.themeRegistry.registerCustomTheme(themeObject);
        if (result.ok && result.themeId) {
            this.themeRegistry.setActiveTheme(result.themeId);
            this.applyTheme();
        }
        return result;
    }

    /**
     * Parse JSON text and register a custom theme.
     * @param {string} jsonText - Raw theme JSON.
     * @returns {{ ok: boolean, errors: string[] }} Import result.
     */
    importThemeJson(jsonText) {
        try {
            const parsed = JSON.parse(String(jsonText || ''));
            const result = this.registerTheme(parsed);
            return { ok: result.ok, errors: result.errors };
        } catch (_) {
            return { ok: false, errors: ['Invalid JSON.'] };
        }
    }

    /**
     * Remove theme by id.
     * @param {string} themeId - Theme id.
     * @returns {{ ok: boolean, reason: string | null }} Deletion result.
     */
    deleteTheme(themeId) {
        if (!this.themeRegistry) {
            return { ok: false, reason: 'Theme registry is not initialized.' };
        }
        const result = this.themeRegistry.removeTheme(String(themeId || ''));
        this.applyTheme();
        return result;
    }

    /**
     * Set active theme id.
     * @param {string} themeId - Theme id.
     * @returns {boolean} True when active theme changed.
     */
    setTheme(themeId) {
        if (!this.themeRegistry) {
            return false;
        }
        const ok = this.themeRegistry.setActiveTheme(themeId);
        if (ok) {
            this.applyTheme();
        }
        return ok;
    }

    /**
     * Read active theme id.
     * @returns {string} Active theme id.
     */
    getActiveThemeId() {
        return this.themeRegistry?.activeThemeId || 'default-dark';
    }

    /**
     * Read theme list.
     * @returns {Array<{ id: string, name: string, kind: "builtin" | "custom" }>} Theme summaries.
     */
    listThemes() {
        return (this.themeRegistry?.listThemes() || []).map((theme) => ({
            id: theme.id,
            name: theme.name,
            kind: theme.kind,
        }));
    }

    /**
     * Sync header domain preview text.
     * @returns {void}
     */
    syncDomainPreview() {
        if (!this.dom) {
            return;
        }
        const domain = this.getState()?.project?.domain;
        this.dom.domainPreview.textContent = domain?.fqdn || 'site.idolist';
    }

    /**
     * Save current project to configured API.
     * @returns {Promise<void>}
     */
    async saveNow() {
        if (!this.dom || !this.saveClient) {
            return;
        }

        this.dom.saveButton.disabled = true;
        this.dom.saveStatus.textContent = 'Saving...';
        const result = await this.saveClient.save(this.getState());
        this.dom.saveStatus.textContent = result.message;
        this.dom.saveButton.disabled = false;
    }

    /**
     * Bind save button click.
     * @returns {void}
     */
    bindSaveButton() {
        if (!this.dom) {
            return;
        }
        this.dom.saveButton.addEventListener('click', () => {
            this.saveNow();
        });
    }

    /**
     * Persist registry theme state into store only when changed.
     * @returns {void}
     */
    persistThemeState() {
        if (!this.themeRegistry || !this.store) {
            return;
        }

        const nextThemeState = this.themeRegistry.exportState();
        const currentThemeState = this.getState()?.editor?.theme || {};
        if (JSON.stringify(currentThemeState) === JSON.stringify(nextThemeState)) {
            return;
        }

        this.store.update((draft) => {
            draft.editor ||= {};
            draft.editor.theme = nextThemeState;
        });
    }

    /**
     * Generate next page id.
     * @param {Record<string, any>} pageMap - Existing page map.
     * @returns {string} Unique page id.
     */
    generatePageId(pageMap) {
        let index = 1;
        while (pageMap[`pg_${index}`]) {
            index += 1;
        }
        return `pg_${index}`;
    }

    /**
     * Generate next id for resource maps.
     * @param {Record<string, any>} resourceMap - Existing map.
     * @param {string} prefix - Prefix.
     * @returns {string} New id.
     */
    generateResourceId(resourceMap, prefix) {
        let index = 1;
        while (resourceMap[`${prefix}_${index}`]) {
            index += 1;
        }
        return `${prefix}_${index}`;
    }

    /**
     * Create unique display name.
     * @param {string[]} existingNames - Existing names.
     * @param {string} seed - Base name.
     * @returns {string} Unique display name.
     */
    createUniqueResourceName(existingNames, seed) {
        const used = new Set(existingNames.map((name) => String(name || '').trim()).filter(Boolean));
        if (!used.has(seed)) {
            return seed;
        }
        let index = 2;
        while (used.has(`${seed}-${index}`)) {
            index += 1;
        }
        return `${seed}-${index}`;
    }

    /**
     * Ensure slug uniqueness across pages.
     * @param {string} slugSeed - Slug seed.
     * @param {Record<string, any>} pageMap - Existing page map.
     * @returns {string} Unique slug.
     */
    ensureUniqueSlug(slugSeed, pageMap) {
        const normalized = String(slugSeed || '')
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '') || 'page';

        const used = new Set(
            Object.values(pageMap || {}).map((page) => String(page?.slug || '').trim()).filter(Boolean),
        );
        if (!used.has(normalized)) {
            return normalized;
        }
        let index = 2;
        while (used.has(`${normalized}-${index}`)) {
            index += 1;
        }
        return `${normalized}-${index}`;
    }

    /**
     * Escape html string.
     * @param {unknown} value - Raw value.
     * @returns {string} Escaped string.
     */
    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Dispose builder instance and cleanup listeners.
     * @returns {void}
     */
    dispose() {
        this.unsubscribers.forEach((unsubscribe) => unsubscribe());
        this.unsubscribers = [];
        this.sidePanelResizeCleanup?.();
        this.sidePanelResizeCleanup = null;
        this.inspectorResizeCleanup?.();
        this.inspectorResizeCleanup = null;
        this.keyboardShortcutsCleanup?.();
        this.keyboardShortcutsCleanup = null;
        this.bothModeResizeCleanup?.();
        this.bothModeResizeCleanup = null;
        this.closeAddNodePicker();
        if (this.dom) {
            this.dom.root.remove();
        }
        markUnmounted(this.host);
    }
}
