import { VsbNodeData } from "./node.js";

export class VsbElementData extends VsbNodeData {
    constructor(args) {
        super(args);
    }

    static _defaultWidth() { return 190; }

    static createFn({ node, graph, vsgraph }) {
        const { element, cache } = VsbNodeData.createFn({ node, graph, vsgraph });

        const defaultWidth = node.data.constructor._defaultWidth();
        element.style.width = (node.data.vsgdata?.width ?? defaultWidth) + "px";

        const header = document.createElement("header");
        const title  = document.createElement("input");
        title.type = "text";
        const body   = document.createElement("div");

        Object.assign(header.style, {
            display:        "flex",
            alignItems:     "center",
            minHeight:      "24px",
            padding:        "5px 9px",
            background:     "#303137",
            boxShadow:      "inset 0 -1px rgba(255, 255, 255, 0.06)",
        });
        Object.assign(title.style, {
            flex:         "1 1 auto",
            minWidth:     "0",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
            fontWeight:   "650",
            color:        "#fff",
            background:   "transparent",
            border:       "none",
            outline:      "none",
            padding:      "0",
            margin:       "0",
            fontFamily:   "inherit",
            fontSize:     "inherit",
            fontWeight:   "650",
            cursor:       "text",
            userSelect:   "auto"
        });
        
        title.addEventListener("change", e => {
            node.data.name = e.target.value;
            if (vsgraph) vsgraph.render();
        });
        title.addEventListener("pointerdown", e => {
            if (document.activeElement === title) {
                e.stopPropagation();
            }
        });
        title.addEventListener("keydown", e => {
            e.stopPropagation();
            if (e.key === "Enter") title.blur();
        });

        const collapseBtn = document.createElement("div");
        collapseBtn.innerHTML = "▼";
        Object.assign(collapseBtn.style, {
            cursor: "pointer",
            marginRight: "6px",
            fontSize: "10px",
            color: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            userSelect: "none"
        });
        collapseBtn.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            if (!node.data.vsgdata) node.data.vsgdata = {};
            node.data.vsgdata.collapsed = !(node.data.vsgdata?.collapsed ?? false);
            if (vsgraph) vsgraph.render();
        });

        header.append(collapseBtn, title);

        Object.assign(body.style, {
            padding:      "8px 9px 12px",
            background:   "#25262a",
            display:      "flex",
            flexDirection: "column"
        });

        element.append(header, body);

        // Resize handles
        const leftResizer = document.createElement("div");
        const rightResizer = document.createElement("div");
        Object.assign(leftResizer.style, {
            position: "absolute", left: "-3px", top: "0", bottom: "0", width: "6px", cursor: "ew-resize", zIndex: "10"
        });
        Object.assign(rightResizer.style, {
            position: "absolute", right: "-3px", top: "0", bottom: "0", width: "6px", cursor: "ew-resize", zIndex: "10"
        });

        let dragInfo = null;
        const startDrag = (e, side) => {
            if (e.button !== 0) return;
            dragInfo = {
                startX: e.clientX,
                startWidth: node.data.vsgdata?.width ?? node.data.constructor._defaultWidth(),
                startXPos: node.data.vsgdata?.x ?? 0,
                side: side
            };
            e.stopPropagation();
            document.addEventListener("pointermove", onMove);
            document.addEventListener("pointerup", onUp);
            document.addEventListener("pointercancel", onUp);
        };

        const onMove = (e) => {
            if (!dragInfo) return;
            const zoom = vsgraph?.camera?.zoom ?? 1;
            const dx = (e.clientX - dragInfo.startX) / zoom;
            
            let newWidth = dragInfo.startWidth + (dragInfo.side === "right" ? dx : -dx);
            if (newWidth < 120) newWidth = 120; // safe minimum
            
            // Recalculate true dx based on clamped width to keep node exactly centered
            const actualDx = (dragInfo.side === "right" ? (newWidth - dragInfo.startWidth) : -(newWidth - dragInfo.startWidth));

            if (!node.data.vsgdata) node.data.vsgdata = {};
            node.data.vsgdata.width = newWidth;
            node.data.vsgdata.x = dragInfo.startXPos + actualDx / 2;

            if (vsgraph) vsgraph.render();
        };

        const onUp = () => {
            dragInfo = null;
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("pointercancel", onUp);
        };

        leftResizer.addEventListener("pointerdown", e => startDrag(e, "left"));
        rightResizer.addEventListener("pointerdown", e => startDrag(e, "right"));

        element.append(leftResizer, rightResizer);

        cache.header = header;
        cache.title  = title;
        cache.body   = body;
        cache.collapseBtn = collapseBtn;

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache }) {
        VsbNodeData.renderFn({ node, element, graph, vsgraph, cache });

        const defaultWidth = node.data.constructor._defaultWidth();
        element.style.width = (node.data.vsgdata?.width ?? defaultWidth) + "px";

        const data = node.data;
        const vsg = data.vsgdata;

        if (cache.collapseBtn) {
            cache.collapseBtn.innerHTML = vsg?.collapsed ? "▶" : "▼";
        }

        if (vsg?.collapsed) {
            cache.body.style.display = "none";
        } else {
            cache.body.style.display = "flex";
        }

        if (document.activeElement !== cache.title) {
            cache.title.value = data.name ?? node.id;
        }
    }
}
