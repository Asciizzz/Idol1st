import { VsData } from "../../Alib/VsGraph/VsData.js";
import { VsbNodeType } from "./node.js";

// ---- Edge geometry helpers ----

const ARROW_LENGTH = 12;
const ARROW_WIDTH  = 12;

function _portForRect(rect, target) {
    const dx = target.x - rect.x;
    const dy = target.y - rect.y;
    const side = Math.abs(dx) >= Math.abs(dy)
        ? (dx >= 0 ? "right" : "left")
        : (dy >= 0 ? "bottom" : "top");

    const normal = _sideNormal(side);

    return {
        x: rect.x + normal.x * (rect.width / 2),
        y: rect.y + normal.y * (rect.height / 2),
        normal,
    };
}

function _sideNormal(side) {
    switch (side) {
        case "left":   return { x: -1, y:  0 };
        case "right":  return { x:  1, y:  0 };
        case "top":    return { x:  0, y: -1 };
        case "bottom": return { x:  0, y:  1 };
        default:       return { x:  1, y:  0 };
    }
}

function _cubicControls(src, dst) {
    const dx = dst.x - src.x;
    const dy = dst.y - src.y;
    const distance = Math.hypot(dx, dy);
    const handle = Math.min(220, Math.max(72, distance * 0.42));

    return {
        c1: { x: src.x + src.normal.x * handle, y: src.y + src.normal.y * handle },
        c2: { x: dst.x + dst.normal.x * handle, y: dst.y + dst.normal.y * handle },
    };
}

function _arrowPoints(tip, control) {
    const dx = tip.x - control.x;
    const dy = tip.y - control.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const baseX = tip.x - ux * ARROW_LENGTH;
    const baseY = tip.y - uy * ARROW_LENGTH;
    const px = -uy;
    const py =  ux;

    return [
        `${tip.x},${tip.y}`,
        `${baseX + px * ARROW_WIDTH / 2},${baseY + py * ARROW_WIDTH / 2}`,
        `${baseX - px * ARROW_WIDTH / 2},${baseY - py * ARROW_WIDTH / 2}`,
    ].join(" ");
}

const isFileNode = (type) => type === VsbNodeType.HTML || type === VsbNodeType.CSS || type === VsbNodeType.JS;

export class VsbEdgeData extends VsData {
    constructor({ rootId = null, order = 0, enabled = true } = {}) {
        super();
        if (rootId != null) this.rootId = rootId;
        this.order   = order;
        this.enabled = enabled;
    }

    static createFn({ edge, graph } = {}) {
        const SVG_NS = "http://www.w3.org/2000/svg";

        const element = document.createElementNS(SVG_NS, "svg");
        Object.assign(element.style, {
            position:      "absolute",
            left:          "0",
            top:           "0",
            width:         "1px",
            height:        "1px",
            overflow:      "visible",
            pointerEvents: "none",
            zIndex:        "0",
        });

        const visiblePath = document.createElementNS(SVG_NS, "path");
        visiblePath.setAttribute("fill", "none");
        visiblePath.setAttribute("stroke-width", "2");
        visiblePath.setAttribute("stroke-linecap", "round");
        visiblePath.setAttribute("pointer-events", "none");

        const socket = document.createElementNS(SVG_NS, "circle");
        socket.setAttribute("r", "3.5");
        socket.setAttribute("pointer-events", "none");

        const arrow = document.createElementNS(SVG_NS, "polygon");
        arrow.setAttribute("pointer-events", "none");

        const hitPath = document.createElementNS(SVG_NS, "path");
        hitPath.setAttribute("fill", "none");
        hitPath.setAttribute("stroke", "transparent");
        hitPath.setAttribute("stroke-width", "16");
        hitPath.setAttribute("stroke-linecap", "round");
        hitPath.setAttribute("pointer-events", "stroke");

        element.append(visiblePath, socket, arrow, hitPath);

        const foreignObject = document.createElementNS(SVG_NS, "foreignObject");
        foreignObject.setAttribute("width", "36");
        foreignObject.setAttribute("height", "22");
        foreignObject.setAttribute("pointer-events", "auto");
        
        const input = document.createElement("input");
        input.type = "text";
        Object.assign(input.style, {
            width: "100%", height: "100%", margin: "0", padding: "0",
            textAlign: "center", fontSize: "12px", fontWeight: "bold",
            background: "#18191c", color: "#d8dde8", 
            border: "1px solid #3a3b40", borderRadius: "3px", outline: "none",
            boxSizing: "border-box"
        });

        input.addEventListener("pointerdown", e => e.stopPropagation());
        input.addEventListener("change", e => {
            const val = parseInt(e.target.value, 10);
            edge.data.order = isNaN(val) ? 0 : val;
            e.target.value = edge.data.order;
        });

        foreignObject.append(input);
        element.append(foreignObject);

        const cache = { visiblePath, socket, arrow, hitPath, foreignObject, input, hover: false };

        hitPath.addEventListener("pointerenter", () => {
            cache.hover = true;
            visiblePath.style.opacity = "1";
            socket.style.opacity      = "1";
            arrow.style.opacity       = "1";
            visiblePath.setAttribute("stroke-width", "3");
        });
        hitPath.addEventListener("pointerleave", () => {
            cache.hover = false;
            visiblePath.setAttribute("stroke-width", "2");
        });

        return { element, cache };
    }

    static renderFn({ edge, element, graph, vsgraph, cache }) {
        const ctx = vsgraph?.ctx;
        const srcNode = graph.getNode(edge.srcId);
        const dstNode = graph.getNode(edge.dstId);
        if (!srcNode || !dstNode) return;

        const srcVsg = srcNode.data?.vsgdata;
        const dstVsg = dstNode.data?.vsgdata;
        if (!srcVsg || !dstVsg) return;

        const srcEl = vsgraph?._instances?.get(`n:${srcNode.id}`)?.element;
        const dstEl = vsgraph?._instances?.get(`n:${dstNode.id}`)?.element;

        const srcRect = {
            x: srcVsg.x ?? 0,
            y: srcVsg.y ?? 0,
            width:  srcEl?.offsetWidth  || 190,
            height: srcEl?.offsetHeight || 58,
        };
        const dstRect = {
            x: dstVsg.x ?? 0,
            y: dstVsg.y ?? 0,
            width:  dstEl?.offsetWidth  || 190,
            height: dstEl?.offsetHeight || 58,
        };

        const src = _portForRect(srcRect, dstRect);
        const dst = _portForRect(dstRect, srcRect);

        const bothFiles = isFileNode(srcNode.data?.type) && isFileNode(dstNode.data?.type);

        let pathD;
        let midX, midY;
        if (bothFiles) {
            pathD = `M ${src.x} ${src.y} L ${dst.x} ${dst.y}`;
            cache.arrow.setAttribute("points", _arrowPoints(dst, src));
            midX = (src.x + dst.x) / 2;
            midY = (src.y + dst.y) / 2;
        } else {
            const controls = _cubicControls(src, dst);
            pathD = `M ${src.x} ${src.y} C ${controls.c1.x} ${controls.c1.y} ${controls.c2.x} ${controls.c2.y} ${dst.x} ${dst.y}`;
            cache.arrow.setAttribute("points", _arrowPoints(dst, controls.c2));
            midX = 0.125 * src.x + 0.375 * controls.c1.x + 0.375 * controls.c2.x + 0.125 * dst.x;
            midY = 0.125 * src.y + 0.375 * controls.c1.y + 0.375 * controls.c2.y + 0.125 * dst.y;
        }

        cache.foreignObject.setAttribute("x", String(midX - 18));
        cache.foreignObject.setAttribute("y", String(midY - 11));

        if (document.activeElement !== cache.input) {
            cache.input.value = edge.data?.order ?? 0;
        }

        const showInput = ctx?.showEdgeInputs ?? false;
        cache.foreignObject.style.display = showInput ? "block" : "none";

        // Determine color
        let color = "rgba(235, 238, 246, 0.46)"; // Default gray
        
        if (bothFiles) {
            color = "rgba(255, 255, 255, 0.7)"; // Included files
        } else {
            const rootId = edge.data?.rootId;
            const rootNode = rootId ? graph.getNode(rootId) : null;
            if (rootNode && isFileNode(rootNode.data?.type)) {
                // Paint edge matching the root file's explicit fileColor, fallback to its type color
                color = rootNode.data.vsgdata?.fileColor 
                     ?? rootNode.data.constructor._fileTypeColor?.() 
                     ?? "rgba(235, 238, 246, 0.46)";
            }
        }

        const highlighted = ctx?.highlightedEdgeIds?.has(edge.id) ?? false;
        let opacity = cache.hover ? "1" : (highlighted ? "0.9" : "0.46");

        cache.visiblePath.setAttribute("d", pathD);

        const isEventEdge = srcNode.data?.type === "ELEMENT" && dstNode.data?.type === "JS_EVENT";
        if (isEventEdge) {
            color = "#f7df1e";
            cache.visiblePath.setAttribute("stroke-dasharray", "4 4");
            if (ctx && !ctx.showEventEdges) opacity = "0";
        } else {
            cache.visiblePath.removeAttribute("stroke-dasharray");
        }

        cache.visiblePath.setAttribute("stroke", color);
        cache.visiblePath.style.opacity = opacity;

        cache.socket.setAttribute("cx", String(src.x));
        cache.socket.setAttribute("cy", String(src.y));
        cache.socket.setAttribute("fill", color);
        cache.socket.style.opacity = opacity;

        cache.arrow.setAttribute("fill", color);
        cache.arrow.style.opacity = opacity;

        cache.hitPath.setAttribute("d", pathD);
        if (isEventEdge && ctx && !ctx.showEventEdges) {
            element.style.pointerEvents = "none";
            cache.foreignObject.style.display = "none";
        } else {
            element.style.pointerEvents = "auto";
        }
    }
}