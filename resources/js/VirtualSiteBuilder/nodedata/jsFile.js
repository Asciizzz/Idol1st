import { VsbNodeData, VsbNodeType } from "./node.js";
import { VsbFileData } from "./file.js";

export class VsbJsFileData extends VsbFileData {
    constructor({ name = "New JS", vsgraph = {} } = {}) {
        super({ type: VsbNodeType.JS, name, vsgraph });
    }

    static _fileColor() { return "#e5c07b"; }

    static createFn({ node, graph, vsgraph }) {
        const { element, cache } = VsbFileData.createFn({ node, graph, vsgraph });

        cache.header.style.background = "#d4a843";
        cache.header.style.boxShadow  = "inset 0 -1px rgba(0, 0, 0, 0.18)";
        cache.title.style.color       = "#fff";
        cache.meta.style.color        = "rgba(255, 255, 255, 0.6)";

        return { element, cache };
    }
}