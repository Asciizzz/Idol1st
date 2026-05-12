import { RenderGraph } from './RenderGraph.js';
import { BUS } from './constants.js';
import {
    ADD_MENU_SCHEMA,
    filterActionsByQuery,
} from './PageToolModel.js';

export class RenderPage {
    constructor(options) {
        this.runtime = options.runtime;
        this.bus = options.bus;
        this.pageId = options.pageId;
        this.mode = 'page';
        this.isActive = false;
        this.activeTool = 'cursor';
        this.popupState = null;
        this.lastPointer = {
            x: Math.floor(window.innerWidth * 0.5),
            y: Math.floor(window.innerHeight * 0.5),
        };
        this.boundFrameDocument = null;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handleDocumentMouseDown = this.handleDocumentMouseDown.bind(this);
        this.handleFramePointerMove = this.handleFramePointerMove.bind(this);
        this.handlePopupClick = this.handlePopupClick.bind(this);
        this.handlePopupInput = this.handlePopupInput.bind(this);
        this.handleFrameSync = this.handleFrameSync.bind(this);

        this.root = document.createElement('div');
        this.root.className = 'render-page';

        this.visualPane = document.createElement('div');
        this.visualPane.className = 'render-page-pane render-page-pane-visual';

        this.graphPane = document.createElement('div');
        this.graphPane.className = 'render-page-pane render-page-pane-graph';

        this.toolsElement = document.createElement('aside');
        this.toolsElement.className = 'page-view-tools';

        this.popupLayer = document.createElement('div');
        this.popupLayer.className = 'page-tool-popup-layer';
        this.popupLayer.hidden = true;
        this.popupLayer.addEventListener('click', this.handlePopupClick);
        this.popupLayer.addEventListener('input', this.handlePopupInput);

        this.root.append(this.visualPane, this.graphPane);
        this.visualPane.appendChild(this.toolsElement);
        document.body.appendChild(this.popupLayer);

        this.graphRenderer = new RenderGraph({
            bus: this.bus,
            runtime: this.runtime,
            pageId: this.pageId,
        });

        this.unsubscribers = [];

        this.renderTools();
    }

    mount(parent) {
        parent.appendChild(this.root);
        this.graphRenderer.mount(this.graphPane);
        this.unsubscribers.push(this.bus.on(BUS.PAGE_SELECTED, this.handleFrameSync));
        this.unsubscribers.push(this.bus.on(BUS.PAGE_CONTENT_CHANGED, this.handleFrameSync));
        this.syncModeUI();
    }

    activate() {
        this.mode = 'page';
        this.isActive = true;
        this.runtime.placeCanvas(this.visualPane);
        this.runtime.setCanvasVisible(true);
        this.runtime.activatePage(this.pageId);
        this.graphRenderer.setPage(this.pageId);
        this.runtime.refreshSelectionDecorations();
        this.bindEditorEvents();
        this.bindFrameDocumentEvents();
        this.syncModeUI();
    }

    deactivate() {
        this.isActive = false;
        this.runtime.setCanvasVisible(false);
        this.runtime.parkCanvas();
        this.unbindEditorEvents();
        this.unbindFrameDocumentEvents();
        this.closePopup();
    }

    reselect() {
        this.mode = this.mode === 'page' ? 'graph' : 'page';
        this.syncModeUI();
    }

    syncModeUI() {
        this.mode = this.mode === 'graph' ? 'graph' : 'page';

        if (this.mode === 'page') {
            this.runtime.placeCanvas(this.visualPane);
            this.runtime.setCanvasVisible(true);
            this.toolsElement.hidden = false;
            this.bindFrameDocumentEvents();
        } else {
            this.runtime.setCanvasVisible(false);
            this.toolsElement.hidden = true;
            this.closePopup();
        }
        this.root.dataset.mode = this.mode;
        this.visualPane.classList.toggle('is-active', this.mode === 'page');
        this.graphPane.classList.toggle('is-active', this.mode === 'graph');

        this.bus.emit(BUS.PAGE_MODE_CHANGED, {
            pageId: this.pageId,
            mode: this.mode,
        });
    }

    destroy() {
        this.graphRenderer.destroy();
        this.unsubscribers.forEach((unsubscribe) => unsubscribe());
        this.unsubscribers = [];
        this.unbindEditorEvents();
        this.unbindFrameDocumentEvents();
        this.closePopup();
        this.popupLayer.remove();
        this.root.remove();
    }

    handleFrameSync(payload) {
        if (!this.isActive || this.mode !== 'page') {
            return;
        }

        if (payload && payload.pageId && payload.pageId !== this.pageId) {
            return;
        }

        this.bindFrameDocumentEvents();
    }

    renderTools() {
        this.toolsElement.innerHTML = '';

        const makeButton = (tool, label, hint) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'page-view-tool-button';
            button.dataset.tool = tool;
            button.title = `${label} (${hint})`;
            button.innerHTML = `
                <span>${label}</span>
                <small>${hint}</small>
            `;
            button.addEventListener('click', (event) => {
                this.lastPointer = { x: event.clientX, y: event.clientY };
                this.activateTool(tool);
            });
            return button;
        };

        this.toolsElement.append(
            makeButton('cursor', 'Cursor', 'Shift+W'),
            makeButton('add', 'Add', 'Shift+A'),
            makeButton('delete', 'Delete', 'Shift+X'),
        );

        this.syncToolUI();
    }

    syncToolUI() {
        this.toolsElement.querySelectorAll('.page-view-tool-button').forEach((button) => {
            button.classList.toggle('is-active', button.dataset.tool === this.activeTool);
        });
    }

    activateTool(tool) {
        this.activeTool = tool === 'cursor' ? 'cursor' : tool;
        this.syncToolUI();

        if (tool === 'add') {
            this.openAddPopup(this.lastPointer);
            return;
        }

        if (tool === 'delete') {
            this.openDeletePopup(this.lastPointer);
            return;
        }

        this.closePopup();
    }

    bindEditorEvents() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('pointermove', this.handlePointerMove, true);
        document.addEventListener('mousedown', this.handleDocumentMouseDown, true);
    }

    unbindEditorEvents() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('pointermove', this.handlePointerMove, true);
        document.removeEventListener('mousedown', this.handleDocumentMouseDown, true);
    }

    bindFrameDocumentEvents() {
        const site = this.runtime.getSite();
        const frame = site ? site.getPageFrame(this.pageId) : null;
        const doc = frame ? frame.contentDocument : null;
        if (!doc || doc === this.boundFrameDocument) {
            return;
        }

        this.unbindFrameDocumentEvents();
        this.boundFrameDocument = doc;
        doc.addEventListener('keydown', this.handleKeyDown);
        doc.addEventListener('pointermove', this.handleFramePointerMove, true);
    }

    unbindFrameDocumentEvents() {
        if (!this.boundFrameDocument) {
            return;
        }
        this.boundFrameDocument.removeEventListener('keydown', this.handleKeyDown);
        this.boundFrameDocument.removeEventListener('pointermove', this.handleFramePointerMove, true);
        this.boundFrameDocument = null;
    }

    handlePointerMove(event) {
        this.lastPointer = {
            x: event.clientX,
            y: event.clientY,
        };
    }

    handleFramePointerMove(event) {
        const frame = event.view && event.view.frameElement ? event.view.frameElement : null;
        if (!frame || typeof frame.getBoundingClientRect !== 'function') {
            return;
        }
        const rect = frame.getBoundingClientRect();
        this.lastPointer = {
            x: rect.left + event.clientX,
            y: rect.top + event.clientY,
        };
    }

    handleKeyDown(event) {
        if (!this.isActive || this.mode !== 'page' || !event.shiftKey) {
            return;
        }

        const key = String(event.key || '').toLowerCase();
        if (key === 'w') {
            event.preventDefault();
            this.activateTool('cursor');
            return;
        }

        if (key === 'a') {
            event.preventDefault();
            this.activateTool('add');
            return;
        }

        if (key === 'x') {
            event.preventDefault();
            this.activateTool('delete');
        }
    }

    handleDocumentMouseDown(event) {
        if (!this.popupState) {
            return;
        }
        if (this.popupLayer.contains(event.target)) {
            return;
        }
        if (this.toolsElement.contains(event.target)) {
            return;
        }
        this.closePopup();
    }

    openAddPopup(point) {
        if (!this.isActive || this.mode !== 'page') {
            return;
        }

        this.popupState = {
            kind: 'add',
            anchor: this.clampPopupAnchor(point, 250, 300),
            chainPath: [],
            search: false,
            query: '',
        };
        this.renderPopup();
    }

    openDeletePopup(point) {
        if (!this.isActive || this.mode !== 'page') {
            return;
        }

        const selectedNodeId = this.runtime.getActiveNodeId();
        if (!selectedNodeId) {
            this.closePopup();
            this.activeTool = 'cursor';
            this.syncToolUI();
            return;
        }

        this.popupState = {
            kind: 'delete',
            anchor: this.clampPopupAnchor(point, 200, 140),
        };
        this.renderPopup();
    }

    closePopup() {
        this.popupState = null;
        this.popupLayer.hidden = true;
        this.popupLayer.innerHTML = '';
    }

    clampPopupAnchor(point, width, height) {
        const margin = 8;
        const x = Math.min(
            Math.max(Number(point && point.x) || margin, margin),
            Math.max(margin, window.innerWidth - width - margin),
        );
        const y = Math.min(
            Math.max(Number(point && point.y) || margin, margin),
            Math.max(margin, window.innerHeight - height - margin),
        );
        return { x, y };
    }

    renderPopup() {
        if (!this.popupState) {
            this.closePopup();
            return;
        }

        this.popupLayer.hidden = false;
        this.popupLayer.innerHTML = '';

        if (this.popupState.kind === 'delete') {
            this.renderDeletePopup();
            return;
        }

        this.renderAddPopup();
    }

    renderDeletePopup() {
        const panel = document.createElement('section');
        panel.className = 'page-tool-popup';
        panel.style.left = `${this.popupState.anchor.x}px`;
        panel.style.top = `${this.popupState.anchor.y}px`;
        panel.innerHTML = `
            <header>Mode</header>
            <button type="button" class="page-tool-popup-item" data-delete-mode="single">Delete single</button>
            <button type="button" class="page-tool-popup-item is-danger" data-delete-mode="branch">Delete branch</button>
        `;
        this.popupLayer.appendChild(panel);
    }

    renderAddPopup() {
        if (this.popupState.search) {
            this.renderAddSearchPopup();
            return;
        }

        const menus = [];
        menus.push(ADD_MENU_SCHEMA);
        let depth = 0;
        let nextMenu = ADD_MENU_SCHEMA;
        while (nextMenu && Array.isArray(nextMenu.items) && depth < this.popupState.chainPath.length) {
            const index = this.popupState.chainPath[depth];
            const item = nextMenu.items[index];
            if (!item || item.type !== 'submenu' || !Array.isArray(item.items)) {
                break;
            }
            menus.push(item);
            nextMenu = item;
            depth += 1;
        }

        menus.forEach((menu, level) => {
            const panel = document.createElement('section');
            panel.className = 'page-tool-popup';
            panel.style.left = `${this.popupState.anchor.x + level * 220}px`;
            panel.style.top = `${this.popupState.anchor.y}px`;
            panel.dataset.level = String(level);

            if (level === 0 && menu.title) {
                const header = document.createElement('header');
                header.textContent = menu.title;
                panel.appendChild(header);
            }

            menu.items.forEach((item, index) => {
                if (!item || typeof item !== 'object') {
                    return;
                }
                if (item.type === 'separator') {
                    const sep = document.createElement('div');
                    sep.className = 'page-tool-popup-separator';
                    panel.appendChild(sep);
                    return;
                }
                if (item.type === 'group') {
                    const group = document.createElement('div');
                    group.className = 'page-tool-popup-group';
                    group.textContent = String(item.label || '');
                    panel.appendChild(group);
                    return;
                }

                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'page-tool-popup-item';
                button.textContent = String(item.label || '');
                button.dataset.itemType = item.type;
                button.dataset.level = String(level);
                button.dataset.index = String(index);

                if (item.type === 'submenu') {
                    button.classList.add('has-submenu');
                }
                if (item.type === 'action') {
                    button.dataset.actionId = String(item.actionId || '');
                    button.dataset.payload = JSON.stringify(item.payload || {});
                }
                panel.appendChild(button);
            });

            this.popupLayer.appendChild(panel);
        });
    }

    renderAddSearchPopup() {
        const panel = document.createElement('section');
        panel.className = 'page-tool-popup';
        panel.style.left = `${this.popupState.anchor.x}px`;
        panel.style.top = `${this.popupState.anchor.y}px`;

        const query = String(this.popupState.query || '');
        const results = filterActionsByQuery(ADD_MENU_SCHEMA, query);
        const list = document.createElement('div');
        list.className = 'page-tool-search-results';

        results.forEach((item) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'page-tool-popup-item page-tool-search-item';
            button.dataset.itemType = 'search-action';
            button.dataset.actionId = String(item.actionId || '');
            button.dataset.payload = JSON.stringify(item.payload || {});
            button.innerHTML = `
                <span>${item.label}</span>
                <small>${item.chain.join(' > ')}</small>
            `;
            list.appendChild(button);
        });

        if (results.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'page-tool-search-empty';
            empty.textContent = 'No matches';
            list.appendChild(empty);
        }

        panel.innerHTML = `
            <header>Add Search</header>
            <input class="page-tool-search-input" data-search-input type="text" value="${query.replace(/"/g, '&quot;')}" placeholder="Find element..." />
        `;
        panel.appendChild(list);
        this.popupLayer.appendChild(panel);

        const input = panel.querySelector('[data-search-input]');
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }

    handlePopupInput(event) {
        if (!this.popupState || this.popupState.kind !== 'add' || !this.popupState.search) {
            return;
        }
        const input = event.target.closest('[data-search-input]');
        if (!input) {
            return;
        }
        this.popupState.query = input.value || '';
        this.renderPopup();
    }

    handlePopupClick(event) {
        const deleteButton = event.target.closest('[data-delete-mode]');
        if (deleteButton) {
            this.runtime.deleteSelectedNode(deleteButton.dataset.deleteMode || '');
            this.closePopup();
            return;
        }

        const itemButton = event.target.closest('.page-tool-popup-item[data-item-type]');
        if (!itemButton) {
            return;
        }

        const itemType = itemButton.dataset.itemType || '';
        if (itemType === 'submenu') {
            const level = Number.parseInt(itemButton.dataset.level || '0', 10);
            const index = Number.parseInt(itemButton.dataset.index || '0', 10);
            this.popupState.chainPath = this.popupState.chainPath.slice(0, level);
            this.popupState.chainPath[level] = index;
            this.renderPopup();
            return;
        }

        if (itemType === 'search') {
            this.popupState.search = true;
            this.popupState.query = '';
            this.renderPopup();
            return;
        }

        if (itemType === 'action' || itemType === 'search-action') {
            const actionId = itemButton.dataset.actionId || '';
            const payloadRaw = itemButton.dataset.payload || '{}';
            let payload = {};
            try {
                payload = JSON.parse(payloadRaw);
            } catch (_) {
                payload = {};
            }
            this.executeAddAction(actionId, payload);
        }
    }

    executeAddAction(actionId, payload) {
        if (!actionId.startsWith('add.')) {
            return;
        }
        const tag = String(payload.tag || '').trim();
        if (!tag) {
            return;
        }
        this.runtime.addNodeUnderSelection({
            tag: tag,
            attrs: payload.attrs || undefined,
            text: payload.text || undefined,
            graph: payload.graph || undefined,
        });
        this.closePopup();
    }
}
