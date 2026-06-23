import { VsData } from "../../Alib/VsGraph/VsData.js";

export const VsbNodeType = Object.freeze({
    HTML:      "HTML",
    ELEMENT:   "ELEMENT",
    JS:        "JS",
    JS_EVENT:  "JS_EVENT",
    CSS:       "CSS",
    CSS_RULE:  "CSS_RULE",
    UNDEFINED: "UNDEFINED",
});

export class VsbNodeData extends VsData {
    constructor({ type = VsbNodeType.UNDEFINED, name = "Node", vsgraph = {} } = {}) {
        super();
        this.type    = type;
        this.name    = name;
        this.vsgraph = { x: 0, y: 0, z: 0, collapsed: false, ...vsgraph };
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
            node.data.vsgraph.x += (e.clientX - drag.x) / zoom;
            node.data.vsgraph.y += (e.clientY - drag.y) / zoom;
            drag.x = e.clientX;
            drag.y = e.clientY;
            vsgraph?.render();
        });

        const endDrag = () => { drag = null; };
        element.addEventListener("pointerup", endDrag);
        element.addEventListener("pointercancel", endDrag);

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache, ctx }) {
        const vsg = node.data.vsgraph;
        const x = vsg?.x ?? 0;
        const y = vsg?.y ?? 0;
        const z = vsg?.z ?? 0;

        element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        element.style.zIndex    = String(z);
    }
}