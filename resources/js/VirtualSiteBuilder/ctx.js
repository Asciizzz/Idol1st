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
        
        // Asset Registry (Local until Global)
        // Stores { url, filename, file } keyed by assetId
        this.assets = new Map(); 
    }

    registerAsset(assetId, assetData) {
        this.assets.set(assetId, assetData);
    }

    getAsset(assetId) {
        return this.assets.get(assetId) || null;
    }
}