import { VsbNodeData, VsbNodeType } from "./node.js";
import { VsbFileData } from "./file.js";

export class VsbCssFileData extends VsbFileData {
    constructor({ name = "New CSS", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.CSS, name, vsgdata });
    }

    static _fileTypeColor() { return "#264de4"; }
    static _fileTypeName() { return "CS"; }

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