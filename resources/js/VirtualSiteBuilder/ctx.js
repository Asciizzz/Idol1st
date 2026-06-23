// Editor state - highlighted nodes/edges, selection, panel state, etc.
// Accessed from vsgraph.ctx in VsData methods.

export class VsbCtx {
    constructor() {
        this.highlightedEdgeIds = new Set();
        this.selectedNodeId     = null;
        this.selectedFileNodeId = null;
        this.showEdgeInputs     = false;
    }
}