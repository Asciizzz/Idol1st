import { Agraph } from "../Alib/Agraph.js";
import {
    VsbNodeType, VsbEdgeData,
    VsbHtmlFileData, VsbCssFileData, VsbJsFileData,
    VsbHtmlElementData, VsbCssRuleData, VsbJsEventData,
    VsbAssetImageData, VsbAssetAudioData
} from "./nodedata/index.js";

const _NODE_CLASS = {
    [VsbNodeType.HTML]:      VsbHtmlFileData,
    [VsbNodeType.CSS]:       VsbCssFileData,
    [VsbNodeType.JS]:        VsbJsFileData,
    [VsbNodeType.ELEMENT]:   VsbHtmlElementData,
    [VsbNodeType.CSS_RULE]:  VsbCssRuleData,
    [VsbNodeType.JS_EVENT]:  VsbJsEventData,
    [VsbNodeType.ASSET_IMAGE]: VsbAssetImageData,
    [VsbNodeType.ASSET_AUDIO]: VsbAssetAudioData,
};

export class VsbJSON {
    static read(json) {
        const raw = typeof json === "string" ? JSON.parse(json) : json;
        const graph = Agraph.deserialize(JSON.stringify(raw));

        graph.forEachNode(node => {
            const data = node.data;
            if (!data || typeof data !== "object") return;

            // Legacy migrations: canvas -> vsgraph -> vsgdata
            if (data.canvas && !data.vsgraph) {
                data.vsgraph = data.canvas;
                delete data.canvas;
            }
            if (data.vsgraph && !data.vsgdata) {
                data.vsgdata = data.vsgraph;
                delete data.vsgraph;
            }

            const Cls = _NODE_CLASS[data.type];
            if (Cls) node.data = new Cls(data);
        });

        graph.forEachEdge(edge => {
            const data = edge.data;
            if (!data || typeof data !== "object") return;
            edge.data = new VsbEdgeData(data);
        });

        return graph;
    }
}
