import { VsbNodeData, VsbNodeType } from "./node.js";

export class VsbCssRuleData extends VsbNodeData {
    constructor({ selector = "", declarations = {}, name = "New CSS Rule", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.CSS_RULE, name, vsgdata });
        this.selector     = selector;
        this.declarations = declarations;
    }

    static _fileTypeColor() { return "#264de4"; }

    static createFn({ node, graph, vsgraph }) {
        const { element, cache } = VsbNodeData.createFn({ node, graph, vsgraph });

        element.style.outlineColor = VsbCssRuleData._fileTypeColor();

        const header   = document.createElement("header");
        const title    = document.createElement("div");
        const controls = document.createElement("div");
        const input    = document.createElement("input");
        const body     = document.createElement("div");

        Object.assign(header.style, {
            display:        "flex",
            alignItems:     "center",
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
            color:        "#fff",
        });
        
        Object.assign(controls.style, {
            padding:      "6px 9px",
            background:   "#25262a",
            borderBottom: "1px solid rgba(0,0,0,0.2)"
        });
        Object.assign(input.style, {
            width:        "100%",
            boxSizing:    "border-box",
            background:   "#18191c",
            border:       "1px solid #3a3b40",
            color:        "#d8dde8",
            padding:      "3px 6px",
            fontSize:     "11px",
            fontFamily:   "ui-monospace, SFMono-Regular, Consolas, monospace",
            outline:      "none",
            borderRadius: "3px"
        });
        
        // Prevent drag handler from stealing focus
        input.addEventListener("pointerdown", e => e.stopPropagation());
        input.addEventListener("change", e => {
            node.data.selector = e.target.value;
            if (vsgraph) vsgraph.render();
        });

        Object.assign(body.style, {
            padding:      "8px 9px 9px",
            color:        "#b9c0ce",
            font:         "11px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace",
            background:   "#232428",
            overflowWrap: "anywhere",
        });

        header.append(title);
        controls.append(input);
        element.append(header, controls, body);

        cache.header = header;
        cache.title  = title;
        cache.input  = input;
        cache.body   = body;

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache, ctx }) {
        VsbNodeData.renderFn({ node, element, graph, vsgraph, cache, ctx });

        element.style.outlineColor = VsbCssRuleData._fileTypeColor();

        const data = node.data;
        cache.title.textContent = data.name ?? node.id;
        
        if (document.activeElement !== cache.input) {
            cache.input.value = data.selector ?? "";
        }

        const decls = data.declarations;
        let bodyText = "";
        if (decls && typeof decls === "object") {
            bodyText = Object.entries(decls).map(([k, v]) => `${k}: ${v};`).join("\n");
        }
        const collapsed = data.vsgdata?.collapsed ?? false;
        cache.body.hidden      = collapsed || bodyText === "";
        cache.body.textContent = bodyText;
    }
}