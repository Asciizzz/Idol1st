import { VsbNodeType, inputStyle, textAreaStyle, createLabel } from "./node.js";
import { VsbFileData } from "./file.js";

export class VsbHtmlFileData extends VsbFileData {
    constructor({ slug = "/", name = "index", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.HTML, name, vsgdata });
        this.slug = slug;
    }

    static _fileTypeColor() { return "#e34c26"; }
    static _fileTypeName() { return "HT"; }
    static _bodyText() { return undefined; }

    static createFn({ node, graph, vsgraph }) {
        const { element, cache } = super.createFn({ node, graph, vsgraph });

        cache.body.textContent = "";
        Object.assign(cache.body.style, {
            display: "flex",
            flexDirection: "column"
        });

        const slugLabel = createLabel("Slug");
        slugLabel.style.marginTop = "0";
        const slugInput = document.createElement("input");
        Object.assign(slugInput.style, inputStyle);
        slugInput.addEventListener("pointerdown", e => e.stopPropagation());
        slugInput.addEventListener("keydown", e => e.stopPropagation());
        slugInput.addEventListener("change", e => {
            node.data.slug = e.target.value;
            if (vsgraph) vsgraph.render();
        });

        const cssLabel = createLabel("Included CSS");
        const cssList = document.createElement("div");
        Object.assign(cssList.style, {
            whiteSpace: "pre-wrap",
            borderLeft: "2px solid #264de4",
            paddingLeft: "6px",
            color: "#b9c0ce",
            fontSize: "11px",
            lineHeight: "1.5",
            marginTop: "2px",
            marginBottom: "6px",
            fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
        });

        const jsLabel = createLabel("Included JS");
        const jsList = document.createElement("div");
        Object.assign(jsList.style, {
            whiteSpace: "pre-wrap",
            borderLeft: "2px solid #f7df1e",
            paddingLeft: "6px",
            color: "#b9c0ce",
            fontSize: "11px",
            lineHeight: "1.5",
            marginTop: "2px",
            marginBottom: "6px",
            fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
        });

        cache.body.append(slugLabel, slugInput, cssLabel, cssList, jsLabel, jsList);

        cache.slugInput = slugInput;
        cache.cssList = cssList;
        cache.jsList = jsList;

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache, ctx }) {
        super.renderFn({ node, element, graph, vsgraph, cache, ctx });

        if (document.activeElement !== cache.slugInput) {
            cache.slugInput.value = node.data.slug ?? "/";
        }

        const outEdges = graph ? (graph.outEdges(node.id) || []) : [];
        let cssNames = [];
        let jsNames = [];
        for (const e of outEdges) {
            const dst = graph.getNode(e.dstId);
            if (!dst || !dst.data) continue;
            if (dst.data.type === VsbNodeType.CSS) cssNames.push(dst.data.name ?? dst.id);
            if (dst.data.type === VsbNodeType.JS) jsNames.push(dst.data.name ?? dst.id);
        }

        const newCssVal = cssNames.length > 0 ? cssNames.join("\n") : "None";
        if (cache.cssList.textContent !== newCssVal) {
            cache.cssList.textContent = newCssVal;
        }

        const newJsVal = jsNames.length > 0 ? jsNames.join("\n") : "None";
        if (cache.jsList.textContent !== newJsVal) {
            cache.jsList.textContent = newJsVal;
        }
        
        const collapsed = node.data.vsgdata?.collapsed ?? false;
        cache.body.hidden = collapsed;
    }
}