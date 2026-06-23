import { VsbNodeData, VsbNodeType } from "./node.js";

export class VsbCssRuleData extends VsbNodeData {
    constructor({ selector = "", declarations = {}, name = "New CSS Rule", vsgraph = {} } = {}) {
        super({ type: VsbNodeType.CSS_RULE, name, vsgraph });
        this.selector     = selector;
        this.declarations = declarations;
    }

    static _fileColor() { return "#5b9fd6"; }

    static createFn({ node, graph, vsgraph }) {
        const { element, cache } = VsbNodeData.createFn({ node, graph, vsgraph });

        element.style.outlineColor = VsbCssRuleData._fileColor();

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

        element.style.outlineColor = VsbCssRuleData._fileColor();

        const data = node.data;
        cache.title.textContent = data.name ?? node.id;
        cache.meta.textContent  = data.selector ?? "";

        const decls = data.declarations;
        let bodyText = "";
        if (decls && typeof decls === "object") {
            bodyText = Object.entries(decls).map(([k, v]) => `${k}: ${v};`).join("\n");
        }
        const collapsed = data.vsgraph?.collapsed ?? false;
        cache.body.hidden      = collapsed || bodyText === "";
        cache.body.textContent = bodyText;
    }
}