import { VsbNodeData, VsbNodeType } from "./node.js";
import { VsbFileData } from "./file.js";

export class VsbCssFileData extends VsbFileData {
    constructor({ name = "New CSS", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.CSS, name, vsgdata });
    }

    static _fileTypeColor() { return "#264de4"; }
    static _fileTypeName() { return "CS"; }
}