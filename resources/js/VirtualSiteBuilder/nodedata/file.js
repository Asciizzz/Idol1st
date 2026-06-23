import { VsbNodeData } from "./node.js";

export class VsbFileData extends VsbNodeData {
    constructor(options = {}) {
        super(options);
    }

    static _fileTypeColor() {
        return "#b9c0ce";
    }

    static createFn({ node, graph, vsgraph } = {}) {
        const { element, cache } = VsbNodeData.createFn({ node, graph, vsgraph });

        const header = document.createElement("header");
        const title  = document.createElement("input");
        title.type = "text";
        const colorInput = document.createElement("input");
        colorInput.type = "color";
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
            flex:         "1 1 auto",
            minWidth:     "0",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
            fontWeight:   "650",
            background:   "transparent",
            border:       "none",
            outline:      "none",
            padding:      "0",
            margin:       "0",
            fontFamily:   "inherit",
            fontSize:     "inherit",
            fontWeight:   "650",
            cursor:       "text",
            color:        "inherit",
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

        if (!document.getElementById("vsb-color-input-style")) {
            const style = document.createElement("style");
            style.id = "vsb-color-input-style";
            style.textContent = `
                .vsb-color-picker {
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    appearance: none;
                    border: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    cursor: pointer;
                    padding: 0;
                    background: transparent;
                }
                .vsb-color-picker::-webkit-color-swatch-wrapper {
                    padding: 0;
                }
                .vsb-color-picker::-webkit-color-swatch {
                    border: 1.5px solid rgba(0, 0, 0, 0.3);
                    border-radius: 50%;
                    box-shadow: 0 0 0 1px rgba(255,255,255,0.15);
                }
                .vsb-color-picker::-moz-color-swatch {
                    border: 1.5px solid rgba(0, 0, 0, 0.3);
                    border-radius: 50%;
                    box-shadow: 0 0 0 1px rgba(255,255,255,0.15);
                }
            `;
            document.head.append(style);
        }

        colorInput.className = "vsb-color-picker";
        Object.assign(colorInput.style, {
            flex: "0 0 auto",
            outline: "none",
            marginRight: "4px",
            marginTop: "2px"
        });
        colorInput.addEventListener("input", e => {
            node.data.vsgdata = node.data.vsgdata || {};
            node.data.vsgdata.fileColor = e.target.value;
            if (vsgraph) vsgraph.render();
        });
        colorInput.addEventListener("pointerdown", e => {
            e.stopPropagation();
        });

        Object.assign(meta.style, {
            flex:          "0 0 auto",
            fontSize:      "11px",
            fontWeight:    "800",
            letterSpacing: "0.5px",
            width:         "34px",
            textAlign:     "center",
            marginRight:   "-2px"
        });
        Object.assign(body.style, {
            padding:      "8px 9px 9px",
            color:        "#b9c0ce",
            font:         "11px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace",
            background:   "#232428",
            overflowWrap: "anywhere",
        });

        header.append(title, colorInput, meta);
        element.append(header, body);

        cache.header = header;
        cache.title  = title;
        cache.colorInput = colorInput;
        cache.meta   = meta;
        cache.body   = body;

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache }) {
        VsbNodeData.renderFn({ node, element, graph, vsgraph, cache });

        // Remove the ugly border color since the header now clearly shows the file color
        element.style.outline = "none";

        const typeColor = this._fileTypeColor();
        const fileColor = node.data.vsgdata?.fileColor ?? typeColor;
        
        // Dynamic text color based on fileColor for the title
        const textColor = this._getTextColor(fileColor);
        
        // Dynamic text color based on typeColor for the trapezoid text
        const metaColor = this._getTextColor(typeColor);

        // Trapezoid-like background: fully fileColor, ending with typeColor at the right edge
        cache.header.style.background = `linear-gradient(105deg, ${fileColor} 0%, ${fileColor} 75%, ${typeColor} 75%, ${typeColor} 100%)`;
        cache.title.style.color = textColor;
        cache.meta.style.color = metaColor;

        if (document.activeElement !== cache.title) {
            cache.title.value = node.data.name ?? node.id;
        }
        cache.colorInput.value = fileColor;
        
        cache.meta.textContent  = this._fileTypeName();

        const bodyText = this._bodyText?.(node, graph);
        const collapsed = node.data.vsgdata?.collapsed ?? false;
        
        if (bodyText !== undefined) {
            cache.body.textContent = bodyText;
            cache.body.hidden = collapsed || bodyText === "";
        } else {
            cache.body.hidden = collapsed;
        }
    }

    static _bodyText(node) {
        return node.id;
    }

    static _fileTypeName() {
        return "File";
    }

    static _getTextColor(hex) {
        if (!hex || typeof hex !== 'string') return "#ffffff";
        hex = hex.replace("#", "");
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length !== 6 && hex.length !== 8) return "#ffffff";
        
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        // Relative luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.55 ? "#000000" : "#ffffff";
    }
}