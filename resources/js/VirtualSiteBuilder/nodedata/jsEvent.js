import { VsbNodeData, VsbNodeType } from "./node.js";

export class VsbJsEventData extends VsbNodeData {
    constructor({ event = "click", code = "", name = "New JS Event", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.JS_EVENT, name, vsgdata });
        this.event = event;
        this.code  = code;
    }

    static _fileTypeColor() { return "#f7df1e"; }

    static createFn({ node, graph, vsgraph } = {}) {
        const { element, cache } = VsbNodeData.createFn({ node, graph, vsgraph });

        element.style.outlineColor = VsbJsEventData._fileTypeColor();

        const header   = document.createElement("header");
        const title    = document.createElement("div");
        const controls = document.createElement("div");
        const select   = document.createElement("select");
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
        Object.assign(select.style, {
            width:        "100%",
            boxSizing:    "border-box",
            background:   "#18191c",
            border:       "1px solid #3a3b40",
            color:        "#d8dde8",
            padding:      "2px 2px",
            fontSize:     "11px",
            fontFamily:   "ui-monospace, SFMono-Regular, Consolas, monospace",
            outline:      "none",
            borderRadius: "3px",
            cursor:       "pointer"
        });
        
        const events = [
            "click", "dblclick", "pointerdown", "pointerup", "pointerenter", 
            "pointerleave", "pointermove", "input", "change", "keydown", 
            "keyup", "submit", "focus", "blur", "wheel", "contextmenu"
        ];
        for (const ev of events) {
            const opt = document.createElement("option");
            opt.value = ev;
            opt.textContent = ev;
            select.append(opt);
        }

        // Prevent drag handler from stealing focus
        select.addEventListener("pointerdown", e => e.stopPropagation());
        select.addEventListener("change", e => {
            node.data.event = e.target.value;
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
        controls.append(select);
        element.append(header, controls, body);

        cache.header = header;
        cache.title  = title;
        cache.select = select;
        cache.body   = body;

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache, ctx }) {
        VsbNodeData.renderFn({ node, element, graph, vsgraph, cache, ctx });

        element.style.outlineColor = VsbJsEventData._fileTypeColor();

        const data = node.data;
        cache.title.textContent = data.name ?? node.id;
        
        if (document.activeElement !== cache.select) {
            cache.select.value = data.event ?? "click";
        }

        const code = data.code ?? "";
        const collapsed = data.vsgdata?.collapsed ?? false;
        cache.body.hidden      = collapsed || code === "";
        cache.body.textContent = code;
    }
}