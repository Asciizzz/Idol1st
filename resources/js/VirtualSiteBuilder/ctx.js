// Editor state — highlighted nodes/edges, selection, panel state, etc.
// Passed into every VsData.renderFn as <ctx>.

export class VsbCtx {
    constructor() {
        this.highlightedEdgeIds = new Set();
        this.selectedNodeId     = null;
    }
}