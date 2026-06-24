// Editor state - highlighted nodes/edges, selection, panel state, etc.
// Accessed from vsgraph.ctx in VsData methods.

export class VsbCtx {
    constructor() {
        this.highlightedEdgeIds = new Set();
        this.selectedNodeId     = null;
        this.selectedFileNodeId = null;
        this.mode = "CURSOR";

        this.showEdgeInputs = true;
        this.showNodeInputs = false;
        this.showEdgeErrors = true;
        this.showElementEdges = true;
        this.showIncludeEdges = true;
        this.showCssEdges = true;
        this.showJsEdges = true;
        this.showAssetEdges = true;
        this.showScriptEventEdges = true;
        this.showPreview = false;
    }
}