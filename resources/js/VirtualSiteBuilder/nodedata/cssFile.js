import { VsbNodeData, VsbNodeType } from "./node.js";
import { VsbFileData } from "./file.js";

export class VsbCssFileData extends VsbFileData {
    constructor({ name = "New CSS", vsgraph = {} } = {}) {
        super({ type: VsbNodeType.CSS, name, vsgraph });
    }

    static _fileColor() { return "#5b9fd6"; }

    static createFn({ node, graph, vsgraph } = {}) {
        const { element, cache } = VsbFileData.createFn({ node, graph, vsgraph });

        cache.header.style.background = "#4b8cc4";
        cache.header.style.boxShadow  = "inset 0 -1px rgba(0, 0, 0, 0.18)";
        cache.title.style.color       = "#fff";
        cache.meta.style.color        = "rgba(255, 255, 255, 0.6)";

        return { element, cache };
    }
}