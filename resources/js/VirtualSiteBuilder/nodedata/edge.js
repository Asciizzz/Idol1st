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

function getRootColor(edge, graph) {
    const rootId = edge.data?.rootId;
    const rootNode = rootId ? graph.getNode(rootId) : null;
    if (rootNode && isFileNode(rootNode.data?.type)) {
        return rootNode.data.vsgdata?.fileColor 
            ?? rootNode.data.constructor._fileTypeColor?.() 
            ?? "rgba(235, 238, 246, 0.46)";
    }
    return "rgba(235, 238, 246, 0.46)";
}

const EDGE_CONFIG_MAP = {
    "HTML->ELEMENT": (edge, graph) => ({
        dashcolor: getRootColor(edge, graph),
        edgeCategory: "showElementEdges"
    }),
    "HTML->CSS": (edge, graph) => ({
        dashcolor: "rgba(255, 255, 255, 0.7)",
        edgeCategory: "showIncludeEdges"
    }),
    "HTML->JS": (edge, graph) => ({
        dashcolor: "rgba(255, 255, 255, 0.7)",
        edgeCategory: "showIncludeEdges"
    }),
    "ELEMENT->ELEMENT": (edge, graph) => {
        const inEdges = graph.inEdges(edge.dstId) || [];
        const parentEdges = inEdges.filter(e => {
            const p = graph.getNode(e.srcId);
            return p && (p.data.type === "ELEMENT" || p.data.type === "HTML");
        });
        if (parentEdges.length > 1) return { error: "Element node cannot have multiple parents." };
        return { dashcolor: getRootColor(edge, graph), edgeCategory: "showElementEdges" };
    },
    "ELEMENT->CSS_RULE": (edge, graph) => ({
        dashcolor: "#3b82f6",
        trackcolor: getRootColor(edge, graph),
        dasharray: "6 6",
        linecap: "round",
        edgeCategory: "showInlineStyleEdges"
    }),
    "ELEMENT->JS_EVENT": (edge, graph) => ({
        dashcolor: "#f7df1e",
        trackcolor: getRootColor(edge, graph),
        dasharray: "4 4",
        edgeCategory: "showScriptEventEdges"
    }),
    "ELEMENT->ASSET_IMAGE": (edge, graph) => ({
        dashcolor: "#ec4899",
        trackcolor: getRootColor(edge, graph),
        dasharray: "2 4",
        linecap: "round",
        edgeCategory: "showAssetEdges"
    }),
    "ELEMENT->ASSET_AUDIO": (edge, graph) => ({
        dashcolor: "#ec4899",
        trackcolor: getRootColor(edge, graph),
        dasharray: "2 4",
        linecap: "round",
        edgeCategory: "showAssetEdges"
    }),
    "CSS->CSS_RULE": (edge, graph) => ({
        dashcolor: getRootColor(edge, graph),
        edgeCategory: "showCssEdges"
    }),
    "CSS_RULE->CSS_RULE": (edge, graph) => ({
        dashcolor: getRootColor(edge, graph),
        edgeCategory: "showCssEdges"
    }),
    "JS->JS_EVENT": (edge, graph) => {
        const inEdges = graph.inEdges(edge.dstId) || [];
        const jsParents = inEdges.filter(e => graph.getNode(e.srcId)?.data.type === "JS");
        if (jsParents.length > 1) return { error: "JS Event cannot belong to multiple JS files." };
        return { dashcolor: getRootColor(edge, graph), edgeCategory: "showJsEdges" };
    }
};

export function resolveEdgeConfig(edge, srcNode, dstNode, graph) {
    const stype = srcNode.data?.type;
    const dtype = dstNode.data?.type;
    const key = `${stype}->${dtype}`;

    const outEdges = graph.outEdges(edge.srcId) || [];
    const inEdges = graph.inEdges(edge.srcId) || [];
    const duplicates = outEdges.filter(e => e.dstId === edge.dstId);
    const reverseDuplicates = inEdges.filter(e => e.srcId === edge.dstId);
    if (duplicates.length > 1 || reverseDuplicates.length > 0) {
        return { dashcolor: "#ff3333", error: `Duplicate or bidirectional edge detected between ${srcNode.data.name || srcNode.id} and ${dstNode.data.name || dstNode.id}.` };
    }

    
    const handler = EDGE_CONFIG_MAP[key];
    if (!handler) {
        if (stype === "JS_EVENT" && dtype === "JS_EVENT") {
            return { dashcolor: "#ff3333", error: "JS Event to JS Event connection is forbidden." };
        }
        return { dashcolor: "#ff3333", error: `Invalid direction: ${stype} cannot connect to ${dtype}.` };
    }
    
    const config = handler(edge, graph);
    if (config.error) {
        return { dashcolor: "#ff3333", error: config.error };
    }
    return config;
}

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
            zIndex:        "-1",
        });

        const trackPath = document.createElementNS(SVG_NS, "path");
        trackPath.setAttribute("fill", "none");
        trackPath.setAttribute("stroke-width", "2");
        trackPath.setAttribute("stroke-linecap", "round");
        trackPath.setAttribute("pointer-events", "none");
        trackPath.style.display = "none"; // Hidden by default

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

        element.append(trackPath, visiblePath, socket, arrow, hitPath);

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

        const errorIcon = document.createElement("div");
        errorIcon.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2 L1 21 H23 Z" fill="#ff3333"/><rect x="11" y="9" width="2" height="5" fill="#ffffff"/><rect x="11" y="16" width="2" height="2" fill="#ffffff"/></svg>`;
        Object.assign(errorIcon.style, {
            width: "100%", height: "100%", margin: "0", padding: "0",
            display: "none", alignItems: "center", justifyContent: "center",
            cursor: "help", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
        });
        errorIcon.addEventListener("pointerdown", e => e.stopPropagation());

        foreignObject.append(input, errorIcon);
        element.append(foreignObject);

        const cache = { trackPath, visiblePath, socket, arrow, hitPath, foreignObject, input, errorIcon, hover: false };

        hitPath.addEventListener("pointerenter", () => {
            cache.hover = true;
            visiblePath.setAttribute("stroke-width", "3");
            trackPath.setAttribute("stroke-width", "3");
            if (vsgraph) vsgraph.render();
        });
        hitPath.addEventListener("pointerleave", () => {
            cache.hover = false;
            visiblePath.setAttribute("stroke-width", "2");
            trackPath.setAttribute("stroke-width", "2");
            if (vsgraph) vsgraph.render();
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

        const config = resolveEdgeConfig(edge, srcNode, dstNode, graph);
        const hasError = !!config.error && (ctx?.showEdgeErrors ?? true);
        const isVisible = config.edgeCategory ? (ctx?.[config.edgeCategory] ?? true) : true;
        const highlighted = ctx?.highlightedEdgeIds?.has(edge.id) ?? false;
        let opacity = cache.hover ? "1" : (highlighted ? "0.9" : "0.46");

        cache.foreignObject.setAttribute("x", String(midX - 18));
        cache.foreignObject.setAttribute("y", String(midY - 11));

        if (document.activeElement !== cache.input) {
            cache.input.value = edge.data?.order ?? 0;
        }

        const showInput = ctx?.showEdgeInputs ?? false;
        
        if (hasError) {
            cache.foreignObject.style.display = "block";
            cache.input.style.display = "none";
            cache.errorIcon.style.display = "flex";
            cache.errorIcon.title = config.error;
            
            // Force DOM update for hot-reload to ensure it's a triangle, not an oval
            cache.errorIcon.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2 L1 21 H23 Z" fill="#ff3333"/><rect x="11" y="9" width="2" height="5" fill="#ffffff"/><rect x="11" y="16" width="2" height="2" fill="#ffffff"/></svg>`;
            cache.errorIcon.style.background = "transparent";
            cache.errorIcon.style.borderRadius = "0";
            cache.errorIcon.style.boxShadow = "none";
            cache.errorIcon.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.5))";
            
            cache.visiblePath.removeAttribute("stroke-dasharray");
            cache.visiblePath.removeAttribute("stroke-linecap");
            cache.visiblePath.setAttribute("stroke-width", cache.hover ? "5" : "4");
            cache.visiblePath.setAttribute("stroke", "#ff3333");
            cache.trackPath.style.display = "none";
        } else {
            cache.foreignObject.style.display = showInput ? "block" : "none";
            cache.input.style.display = "block";
            cache.errorIcon.style.display = "none";
            
            if (config.dasharray) cache.visiblePath.setAttribute("stroke-dasharray", config.dasharray);
            else cache.visiblePath.removeAttribute("stroke-dasharray");
            
            if (config.linecap) cache.visiblePath.setAttribute("stroke-linecap", config.linecap);
            else cache.visiblePath.removeAttribute("stroke-linecap");
            
            cache.visiblePath.setAttribute("stroke-width", cache.hover ? "3" : "2");
        }

        cache.visiblePath.setAttribute("d", pathD);
        cache.visiblePath.setAttribute("stroke", config.dashcolor);
        
        if (!isVisible) opacity = "0";
        cache.visiblePath.style.opacity = opacity;

        const terminalColor = (config.trackcolor && !hasError) ? config.trackcolor : config.dashcolor;

        if (config.trackcolor && !hasError) {
            cache.trackPath.style.display = "block";
            cache.trackPath.setAttribute("d", pathD);
            cache.trackPath.setAttribute("stroke", config.trackcolor);
            cache.trackPath.setAttribute("stroke-width", cache.hover ? "3" : "2");
            cache.trackPath.style.opacity = String(parseFloat(opacity) * 0.4);
        } else {
            cache.trackPath.style.display = "none";
        }

        cache.socket.setAttribute("cx", String(src.x));
        cache.socket.setAttribute("cy", String(src.y));
        cache.socket.setAttribute("fill", terminalColor);
        cache.socket.style.opacity = opacity;

        cache.arrow.setAttribute("fill", terminalColor);
        cache.arrow.style.opacity = opacity;

        cache.hitPath.setAttribute("d", pathD);

        if (!isVisible) {
            element.style.pointerEvents = "none";
            cache.foreignObject.style.display = "none";
        } else {
            element.style.pointerEvents = "auto";
        }
    }
}