import { RenderGraph } from './RenderGraph.js';
import { BUS } from './constants.js';

export class RenderPage {
    constructor(options) {
        this.runtime = options.runtime;
        this.bus = options.bus;
        this.pageId = options.pageId;
        this.mode = 'page';

        this.root = document.createElement('div');
        this.root.className = 'render-page';

        this.visualPane = document.createElement('div');
        this.visualPane.className = 'render-page-pane render-page-pane-visual';

        this.graphPane = document.createElement('div');
        this.graphPane.className = 'render-page-pane render-page-pane-graph';

        this.root.append(this.visualPane, this.graphPane);

        this.graphRenderer = new RenderGraph({
            bus: this.bus,
            runtime: this.runtime,
            pageId: this.pageId,
        });
    }

    mount(parent) {
        parent.appendChild(this.root);
        this.graphRenderer.mount(this.graphPane);
        this.syncModeUI();
    }

    activate() {
        this.mode = 'page';
        this.runtime.placeCanvas(this.visualPane);
        this.runtime.setCanvasVisible(true);
        this.runtime.activatePage(this.pageId);
        this.graphRenderer.setPage(this.pageId);
        this.syncModeUI();
    }

    deactivate() {
        this.runtime.setCanvasVisible(false);
        this.runtime.parkCanvas();
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
        } else {
            this.runtime.setCanvasVisible(false);
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
        this.root.remove();
    }
}
