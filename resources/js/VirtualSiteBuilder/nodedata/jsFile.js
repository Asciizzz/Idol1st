import { VsbNodeData, VsbNodeType } from "./node.js";
import { VsbFileData } from "./file.js";

export class VsbJsFileData extends VsbFileData {
    constructor({ name = "New JS", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.JS, name, vsgdata });
    }

    static _fileTypeColor() { return "#f7df1e"; }
    static _fileTypeName() { return "JS"; }
}