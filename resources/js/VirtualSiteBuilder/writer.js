import { Adag } from "../Alib/Agraph.js";
import {
    VsbCssFileData,
    VsbCssRuleData,
    VsbEdgeData,
    VsbHtmlElementData,
    VsbHtmlFileData,
    VsbJsEventData,
    VsbJsFileData,
} from "./nodedata/index.js";

export class VsbWriter {
    constructor(graph) { this.graph = graph; }

    static addHtmlFile(graph, options = {}) { return graph.addNode({ data: new VsbHtmlFileData(options) }); }
    static addCssFile(graph, options = {}) { return graph.addNode({ data: new VsbCssFileData(options) }); }
    static addJsFile(graph, options = {}) { return graph.addNode({ data: new VsbJsFileData(options) }); }
    static addElement(graph, options = {}) { return graph.addNode({ data: new VsbHtmlElementData(options) }); }
    static addCssRule(graph, options = {}) { return graph.addNode({ data: new VsbCssRuleData(options) }); }
    static addJsEvent(graph, options = {}) { return graph.addNode({ data: new VsbJsEventData(options) }); }

    static addEdge(graph, srcId, dstId, options = {}) {
        return Adag.addEdge(graph, srcId, dstId, {
            data: new VsbEdgeData(options),
        });
    }


    // Wrapper methods
    addHtmlFile(options = {}) { return VsbWriter.addHtmlFile(this.graph, options); }
    addCssFile(options = {}) { return VsbWriter.addCssFile(this.graph, options); }
    addJsFile(options = {}) { return VsbWriter.addJsFile(this.graph, options); }
    addElement(options = {}) { return VsbWriter.addElement(this.graph, options); }
    addCssRule(options = {}) { return VsbWriter.addCssRule(this.graph, options); }
    addJsEvent(options = {}) { return VsbWriter.addJsEvent(this.graph, options); }
    addEdge(srcId, dstId, options = {}) { return VsbWriter.addEdge(this.graph, srcId, dstId, options); }

}
