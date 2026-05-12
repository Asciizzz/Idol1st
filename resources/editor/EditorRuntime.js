import { BUS, DND_TYPE_NODE_ID } from './constants.js';

export class EditorRuntime {
    constructor(options) {
        this.bus = options.bus;
        this.canvasHost = options.canvasHost;
        this.canvasParkingHost = options.canvasParkingHost || null;
        this.site = null;
        this.boundFrames = new Set();

        this.handleFrameDragStart = this.handleFrameDragStart.bind(this);
        this.handleFrameDragOver = this.handleFrameDragOver.bind(this);
        this.handleFrameDragLeave = this.handleFrameDragLeave.bind(this);
        this.handleFrameDrop = this.handleFrameDrop.bind(this);
        this.handleFrameDragEnd = this.handleFrameDragEnd.bind(this);
        this.handleFrameClick = this.handleFrameClick.bind(this);
    }

    async init() {
        if (!window.EzVirtualSite) {
            throw new Error('EzVirtualSite is not loaded.');
        }

        const data = await this.loadInitialProject();
        const site = new window.EzVirtualSite();

        site
            .setGlobalStyle(this.buildRuntimeOutlineCSS())
            .setHost(this.canvasHost)
            .setData(data)
            .init();

        this.site = site;
        window.vsite = site;

        this.bindSiteEvents();
        this.refreshFrameBindings();
        this.bus.emit(BUS.READY, {
            pages: site.listPages(),
            currentPageId: site.getActiveID(),
        });
    }

    getSite() {
        return this.site;
    }

    activatePage(pageId) {
        if (!this.site) {
            return false;
        }

        const changed = this.site.changePage(pageId);
        if (changed) {
            this.refreshFrameBindings();
            window.requestAnimationFrame(() => {
                if (!this.site) {
                    return;
                }
                this.site.reload(pageId);
                this.refreshFrameBindings();
            });
        }
        return changed;
    }

    placeCanvas(containerElement) {
        if (!containerElement || !(containerElement instanceof Element)) {
            return;
        }

        if (this.canvasHost.parentElement !== containerElement) {
            containerElement.appendChild(this.canvasHost);
        }
    }

    parkCanvas() {
        if (!(this.canvasParkingHost instanceof Element)) {
            return;
        }

        if (this.canvasHost.parentElement !== this.canvasParkingHost) {
            this.canvasParkingHost.appendChild(this.canvasHost);
        }
    }

    setCanvasVisible(isVisible) {
        this.canvasHost.classList.toggle('is-hidden', !isVisible);
    }

    bindSiteEvents() {
        const bus = this.bus;
        const runtime = this;

        document.addEventListener('ezvs:pages-changed', function(event) {
            runtime.refreshFrameBindings();
            bus.emit(BUS.PAGES_CHANGED, event.detail || {});
        });

        document.addEventListener('ezvs:page-selected', function(event) {
            runtime.refreshSelectionDecorations();
            bus.emit(BUS.PAGE_SELECTED, event.detail || {});
        });

        document.addEventListener('ezvs:page-content-changed', function(event) {
            runtime.refreshFrameBindings();
            runtime.refreshSelectionDecorations();
            bus.emit(BUS.PAGE_CONTENT_CHANGED, event.detail || {});
            bus.emit(BUS.STYLES_CHANGED, event.detail || {});
            bus.emit(BUS.SCRIPTS_CHANGED, event.detail || {});
        });
    }

    refreshFrameBindings() {
        if (!this.site) {
            return;
        }

        const runtime = this;

        this.site.listPages().forEach(function(page) {
            const frame = runtime.site.getPageFrame(page.id);
            const doc = frame ? frame.contentDocument : null;
            if (!doc) {
                return;
            }

            if (runtime.boundFrames.has(page.id)) {
                runtime.ensureFrameNodesDraggable(doc);
                return;
            }

            runtime.boundFrames.add(page.id);
            doc.addEventListener('dragstart', runtime.handleFrameDragStart);
            doc.addEventListener('dragover', runtime.handleFrameDragOver);
            doc.addEventListener('dragleave', runtime.handleFrameDragLeave);
            doc.addEventListener('drop', runtime.handleFrameDrop);
            doc.addEventListener('dragend', runtime.handleFrameDragEnd);
            doc.addEventListener('click', runtime.handleFrameClick);
            runtime.ensureFrameNodesDraggable(doc);
        });

        this.refreshSelectionDecorations();
    }

    ensureFrameNodesDraggable(doc) {
        if (!doc || typeof doc.querySelectorAll !== 'function') {
            return;
        }

        doc.querySelectorAll('[data-vs-node-id]').forEach(function(element) {
            element.setAttribute('draggable', 'true');
        });
    }

    refreshSelectionDecorations() {
        if (!this.site) {
            return;
        }

        const selectedNodeId = this.getActiveNodeId();
        this.site.listPages().forEach((page) => {
            const frame = this.site.getPageFrame(page.id);
            const doc = frame ? frame.contentDocument : null;
            if (!doc || typeof doc.querySelectorAll !== 'function') {
                return;
            }

            doc.querySelectorAll('[data-vs-node-id]').forEach((element) => {
                const nodeId = element.getAttribute('data-vs-node-id');
                if (selectedNodeId && nodeId === selectedNodeId) {
                    element.setAttribute('data-vs-selected', 'true');
                    return;
                }
                element.removeAttribute('data-vs-selected');
            });
        });
    }

    handleFrameDragStart(event) {
        const nodeElement = this.getEventNodeElement(event);
        if (!event || !event.dataTransfer || !nodeElement) {
            return;
        }

        const nodeId = nodeElement.getAttribute('data-vs-node-id');
        if (!nodeId) {
            return;
        }

        event.dataTransfer.setData(DND_TYPE_NODE_ID, nodeId);
        event.dataTransfer.effectAllowed = 'move';
    }

    handleFrameDragOver(event) {
        if (!event || !event.dataTransfer) {
            return;
        }

        const types = event.dataTransfer.types || [];
        if (!types.includes(DND_TYPE_NODE_ID)) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        this.toggleDropTarget(event, true);
    }

    handleFrameDragLeave(event) {
        this.toggleDropTarget(event, false);
    }

    handleFrameDrop(event) {
        if (!this.site || !event || !event.dataTransfer) {
            return;
        }

        event.preventDefault();
        const draggedNodeId = event.dataTransfer.getData(DND_TYPE_NODE_ID);
        const nodeElement = this.getEventNodeElement(event);
        const parentId = nodeElement ? (nodeElement.getAttribute('data-vs-node-id') || null) : null;

        if (draggedNodeId && draggedNodeId !== parentId) {
            this.site.reparentNode(draggedNodeId, parentId);
        }

        const doc = event.view && event.view.document ? event.view.document : null;
        this.clearDropTargets(doc);
    }

    handleFrameDragEnd(event) {
        const doc = event && event.view ? event.view.document : null;
        this.clearDropTargets(doc);
    }

    handleFrameClick(event) {
        const nodeElement = this.getEventNodeElement(event);
        const nodeId = nodeElement ? nodeElement.getAttribute('data-vs-node-id') : null;
        if (nodeId) {
            this.selectNode(nodeId);
        } else {
            this.selectRoot();
        }
    }

    getEventNodeElement(event) {
        return event && event.target && event.target.closest
            ? event.target.closest('[data-vs-node-id]')
            : null;
    }

    getActiveNodeId() {
        if (!this.site || typeof this.site.getActiveNodeId !== 'function') {
            return null;
        }
        return this.site.getActiveNodeId();
    }

    setActiveNodeId(nodeId) {
        if (!this.site || typeof this.site.setActiveNodeId !== 'function') {
            return false;
        }
        const changed = this.site.setActiveNodeId(nodeId);
        if (changed) {
            this.refreshSelectionDecorations();
        }
        return changed;
    }

    selectRoot() {
        return this.setActiveNodeId(null);
    }

    selectNode(nodeId) {
        if (!nodeId) {
            return this.selectRoot();
        }
        return this.setActiveNodeId(String(nodeId));
    }

    getSelectedParentForAdd() {
        const nodeId = this.getActiveNodeId();
        return nodeId || null;
    }

    addNodeUnderSelection(definition = {}) {
        if (!this.site) {
            return null;
        }
        const parent = this.getSelectedParentForAdd();
        const payload = {
            ...definition,
            parent: parent || undefined,
        };
        const nodeId = this.site.addNode(payload);
        if (nodeId) {
            this.selectNode(nodeId);
        }
        return nodeId;
    }

    deleteSelectedNode(mode) {
        if (!this.site) {
            return false;
        }
        const selectedNodeId = this.getActiveNodeId();
        if (!selectedNodeId) {
            return false;
        }
        const selectedNode = this.site.readNode(selectedNodeId);
        if (!selectedNode) {
            return false;
        }

        const keepChildren = mode === 'single';
        const parentNodeId = selectedNode.parent || null;
        const deleted = this.site.deleteNode(selectedNodeId, keepChildren);
        if (!deleted) {
            return false;
        }

        if (parentNodeId && this.site.readNode(parentNodeId)) {
            this.selectNode(parentNodeId);
            return true;
        }

        this.selectRoot();
        return true;
    }

    toggleDropTarget(event, isActive) {
        const nodeElement = this.getEventNodeElement(event);
        if (!nodeElement) {
            return;
        }

        if (isActive) {
            nodeElement.setAttribute('data-vs-drop-target', 'true');
        } else {
            nodeElement.removeAttribute('data-vs-drop-target');
        }
    }

    clearDropTargets(doc) {
        if (!doc || typeof doc.querySelectorAll !== 'function') {
            return;
        }

        doc.querySelectorAll('[data-vs-drop-target="true"]').forEach(function(element) {
            element.removeAttribute('data-vs-drop-target');
        });
    }

    async loadInitialProject() {
        if (window.webConstructInitialProject && typeof window.webConstructInitialProject === 'object') {
            return window.webConstructInitialProject;
        }

        const initialProjectUrl = window.webConstructInitialProjectUrl || '/jsons/example.json';
        const response = await fetch(initialProjectUrl);
        if (!response.ok) {
            throw new Error(`Failed to load initial project: HTTP ${response.status}`);
        }
        return response.json();
    }

    buildRuntimeOutlineCSS() {
        return `
            [data-vs-node-id] {
                outline: 1px solid transparent;
                outline-offset: -1px;
            }

            [data-vs-node-id]:hover {
                outline: 2px solid #f97316;
                outline-offset: -1px;
            }

            [data-vs-node-id][data-vs-selected="true"] {
                outline: 2px solid #facc15;
                outline-offset: -1px;
            }

            [data-vs-node-id][data-vs-drop-target="true"] {
                outline: 2px dashed #22d3ee;
                outline-offset: -1px;
            }
        `;
    }
}
