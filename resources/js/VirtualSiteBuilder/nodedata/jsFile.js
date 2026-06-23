import { VsbNodeData, VsbNodeType } from "./node.js";
import { VsbFileData } from "./file.js";

export class VsbJsFileData extends VsbFileData {
    constructor({ name = "New JS", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.JS, name, vsgdata });
    }

    static _fileTypeColor() { return "#f7df1e"; }
    static _fileTypeName() { return "JS"; }

    static _bodyText(node, graph) {
        if (!graph) return "Included in 0 HTML";
        const inEdges = graph.inEdges(node.id) || [];
        let count = 0;
        for (const e of inEdges) {
            const src = graph.getNode(e.srcId);
            if (src && src.data && src.data.type === VsbNodeType.HTML) count++;
        }
        return `Included in ${count} HTML`;
    }
}