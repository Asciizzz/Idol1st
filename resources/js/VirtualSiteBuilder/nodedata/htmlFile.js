import { VsbNodeData, VsbNodeType } from "./node.js";
import { VsbFileData } from "./file.js";

export class VsbHtmlFileData extends VsbFileData {
    constructor({ name = "New HTML", slug = "home", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.HTML, name, vsgdata });
        this.slug = slug;
    }

    static _fileTypeColor() { return "#e34c26"; }
    static _fileTypeName() { return "HT"; }

    static _bodyText(node) {
        return node.data.slug ?? "";
    }
}