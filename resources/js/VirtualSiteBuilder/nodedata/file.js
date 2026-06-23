import { VsbNodeData } from "./node.js";

export class VsbFileData extends VsbNodeData {
    constructor(options = {}) {
        super(options);
    }

    static _fileColor() {
        return "#b9c0ce";
    }

    static createFn({ node, graph, vsgraph } = {}) {
        const { element, cache } = VsbNodeData.createFn({ node, graph, vsgraph });

        const header = document.createElement("header");
        const title  = document.createElement("div");
        const meta   = document.createElement("div");
        const body   = document.createElement("div");

        Object.assign(header.style, {
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            gap:            "10px",
            minHeight:      "24px",
            padding:        "5px 9px",
            background:     "#303137",
            boxShadow:      "inset 0 -1px rgba(255, 255, 255, 0.06)",
        });
        Object.assign(title.style, {
            minWidth:     "0",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
            fontWeight:   "650",
        });
        Object.assign(meta.style, {
            flex:     "0 0 auto",
            color:    "#9aa3b2",
            fontSize: "10px",
        });
        Object.assign(body.style, {
            padding:      "8px 9px 9px",
            color:        "#b9c0ce",
            font:         "11px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace",
            background:   "#232428",
            overflowWrap: "anywhere",
        });

        header.append(title, meta);
        element.append(header, body);

        cache.header = header;
        cache.title  = title;
        cache.meta   = meta;
        cache.body   = body;

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache, ctx }) {
        VsbNodeData.renderFn({ node, element, graph, vsgraph, cache, ctx });

        const fileColor = this._fileColor();
        element.style.outlineColor = node.data.vsgraph?.fileColor ?? fileColor;

        cache.title.textContent = node.data.name ?? node.id;
        cache.meta.textContent  = node.id;

        const bodyText = this._bodyText(node);
        const collapsed = node.data.vsgraph?.collapsed ?? false;
        cache.body.hidden      = collapsed || bodyText === "";
        cache.body.textContent = bodyText;
    }

    static _bodyText(node) {
        return node.id;
    }
}