import { VsbNodeData, VsbNodeType } from "./node.js";
import { VsbFileData } from "./file.js";

export class VsbHtmlFileData extends VsbFileData {
    constructor({ name = "New HTML", slug = "home", vsgraph = {} } = {}) {
        super({ type: VsbNodeType.HTML, name, vsgraph });
        this.slug = slug;
    }

    static _fileColor() { return "#e16570"; }

    static createFn({ node, graph, vsgraph }) {
        const { element, cache } = VsbFileData.createFn({ node, graph, vsgraph });

        cache.header.style.background = "#f05b5b";
        cache.header.style.boxShadow  = "inset 0 -1px rgba(0, 0, 0, 0.18)";
        cache.title.style.color       = "#fff";
        cache.meta.style.color        = "rgba(255, 255, 255, 0.6)";

        return { element, cache };
    }

    static _bodyText(node) {
        return node.data.slug ?? "";
    }
}