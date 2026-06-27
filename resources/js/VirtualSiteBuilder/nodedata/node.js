import { VsData } from "../../Alib/VsGraph/VsData.js";

export function autoExpand(ta) {
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
}

export const inputStyle = {
    width:        "100%",
    boxSizing:    "border-box",
    background:   "#18191c",
    border:       "1px solid #3a3b40",
    color:        "#d8dde8",
    padding:      "5px 7px",
    fontSize:     "11px",
    lineHeight:   "1.7",
    fontFamily:   "ui-monospace, SFMono-Regular, Consolas, monospace",
    outline:      "none",
    borderRadius: "3px"
};

export const textAreaStyle = {
    ...inputStyle,
    resize:       "none",
    overflow:     "hidden"
};

export const createLabel = (text) => {
    const label = document.createElement("div");
    label.textContent = text;
    Object.assign(label.style, {
        fontSize:      "9px",
        fontWeight:    "bold",
        color:         "#72798a",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        marginBottom:  "3px",
        marginTop:     "8px"
    });
    return label;
};

export const VsbNodeType = Object.freeze({
    HTML:      "HTML",
    ELEMENT:   "ELEMENT",
    JS:        "JS",
    JS_EVENT:  "JS_EVENT",
    CSS:       "CSS",
    CSS_RULE:  "CSS_RULE",
    ASSET_IMAGE: "ASSET_IMAGE",
    ASSET_AUDIO: "ASSET_AUDIO",
    UNDEFINED: "UNDEFINED",
});

export class VsbNodeData extends VsData {
    constructor({ type = VsbNodeType.UNDEFINED, name = "Node", vsgdata = {} } = {}) {
        super();
        this.type    = type;
        this.name    = name;
        this.vsgdata = { x: 0, y: 0, z: 0, collapsed: false, ...vsgdata };
    }

    static createFn({ node, graph, vsgraph } = {}) {
        const { element, cache } = VsData.createFn();

        Object.assign(element.style, {
            position:        "absolute",
            left:            "0",
            top:             "0",
            width:           "190px",
            minHeight:       "58px",
            overflow:        "hidden",
            border:          "0",
            outlineStyle:    "solid",
            outlineWidth:    "1px",
            outlineColor:    "#8b93a7",
            outlineOffset:   "0",
            borderRadius:    "6px",
            background:      "#25262a",
            boxShadow:       "0 10px 24px rgba(0, 0, 0, 0.28)",
            color:           "#d8dde8",
            cursor:          "default",
            transformOrigin: "0 0",
            userSelect:      "none",
        });

        // Drag
        let drag = null;

        element.addEventListener("pointerdown", e => {
            if (e.button !== 0) return;
            drag = { x: e.clientX, y: e.clientY };
            element.setPointerCapture(e.pointerId);
            e.stopPropagation();
        });

        element.addEventListener("pointermove", e => {
            if (!drag) return;
            const zoom = vsgraph?.camera?.zoom ?? 1;
            node.data.vsgdata.x += (e.clientX - drag.x) / zoom;
            node.data.vsgdata.y += (e.clientY - drag.y) / zoom;
            drag.x = e.clientX;
            drag.y = e.clientY;
            vsgraph?.render();
        });

        const endDrag = () => { drag = null; };
        element.addEventListener("pointerup", endDrag);
        element.addEventListener("pointercancel", endDrag);

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache }) {
        const vsg = node.data.vsgdata;
        const x = vsg?.x ?? 0;
        const y = vsg?.y ?? 0;
        const z = vsg?.z ?? 0;

        element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        const baseZ = vsg?.collapsed ? 1 : 2;
        element.style.zIndex    = String((vsg?.z ?? 0) + baseZ);

        const allowInput = vsgraph?.ctx?.showNodeInputs ?? false;
        if (cache.lastAllowInput !== allowInput) {
            cache.lastAllowInput = allowInput;
            if (cache.title) {
                cache.title.style.pointerEvents = allowInput ? "auto" : "none";
                cache.title.readOnly = !allowInput;
            }
        }
    }
}