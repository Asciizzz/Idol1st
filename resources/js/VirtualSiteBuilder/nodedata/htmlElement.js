import { VsbNodeType, autoExpand, inputStyle, textAreaStyle, createLabel } from "./node.js";
import { VsbElementData } from "./elementNode.js";
import { VsbEdgeData } from "./edge.js";

export class VsbHtmlElementData extends VsbElementData {
    constructor({ tag = "div", attrs = {}, attrsText = "", text = "", jsEventIds = [], name = "New Element", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.ELEMENT, name, vsgdata });
        this.tag        = tag;
        this.attrs      = attrs ?? {};
        this.text       = text;
        this.jsEventIds = jsEventIds ?? [];

        if (!attrsText && this.attrs && Object.keys(this.attrs).length > 0) {
            this.attrsText = Object.entries(this.attrs).map(([k,v]) => `${k}: "${v}"`).join(", ");
        } else {
            this.attrsText = attrsText;
        }
    }

    static createFn({ node, graph, vsgraph }) {
        const { element, cache } = VsbElementData.createFn({ node, graph, vsgraph });

        const tagLabel = createLabel("HTML Tag");
        tagLabel.style.marginTop = "0";
        const tagInput = document.createElement("input");
        Object.assign(tagInput.style, inputStyle);
        tagInput.addEventListener("pointerdown", e => e.stopPropagation());
        tagInput.addEventListener("keydown", e => e.stopPropagation());
        tagInput.addEventListener("change", e => {
            node.data.tag = e.target.value;
            if (vsgraph) vsgraph.render();
        });

        const attrsLabel = createLabel("Attributes");
        const attrsInput = document.createElement("textarea");
        attrsInput.rows = 1;
        Object.assign(attrsInput.style, textAreaStyle);
        attrsInput.style.color = "#8b93a7";
        attrsInput.placeholder = 'class: "btn", id: "app"';
        attrsInput.addEventListener("pointerdown", e => e.stopPropagation());
        attrsInput.addEventListener("keydown", e => e.stopPropagation());
        attrsInput.addEventListener("input", e => autoExpand(e.target));
        attrsInput.addEventListener("change", e => {
            node.data.attrsText = e.target.value;
            if (vsgraph) vsgraph.render();
        });

        const textLabel = createLabel("Inner Text");
        const textInput = document.createElement("textarea");
        textInput.rows = 1;
        Object.assign(textInput.style, textAreaStyle);
        textInput.placeholder = 'Inner text...';
        textInput.addEventListener("pointerdown", e => e.stopPropagation());
        textInput.addEventListener("keydown", e => e.stopPropagation());
        textInput.addEventListener("input", e => autoExpand(e.target));
        textInput.addEventListener("change", e => {
            node.data.text = e.target.value;
            if (vsgraph) vsgraph.render();
        });

        const styleLabel = createLabel("Inline Styles");
        const styleList = document.createElement("div");
        Object.assign(styleList.style, {
            marginTop: "6px", fontSize: "11px", color: "#b9c0ce",
            display: "flex", flexDirection: "column", gap: "2px"
        });

        const assetLabel = createLabel("Asset Src");
        const assetList = document.createElement("div");
        Object.assign(assetList.style, {
            marginTop: "6px", fontSize: "11px", color: "#b9c0ce",
            display: "flex", flexDirection: "column", gap: "2px"
        });

        const eventsLabel = createLabel("Events");
        const boundEventsList = document.createElement("div");
        Object.assign(boundEventsList.style, {
            marginTop: "6px", fontSize: "11px", color: "#b9c0ce",
            display: "flex", flexDirection: "column", gap: "2px"
        });

        cache.body.append(tagLabel, tagInput, attrsLabel, attrsInput, styleLabel, styleList, textLabel, textInput, assetLabel, assetList, eventsLabel, boundEventsList);

        cache.tagInput   = tagInput;
        cache.attrsInput = attrsInput;
        cache.textInput  = textInput;
        cache.styleList  = styleList;
        cache.assetList  = assetList;
        cache.boundEventsList = boundEventsList;

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache }) {
        VsbElementData.renderFn({ node, element, graph, vsgraph, cache });

        const data = node.data;
        const collapsed = data.vsgdata?.collapsed ?? false;

        if (!collapsed) {
            if (document.activeElement !== cache.tagInput) {
                cache.tagInput.value = data.tag ?? "div";
            }

            if (document.activeElement !== cache.attrsInput) {
                cache.attrsInput.value = data.attrsText ?? "";
                autoExpand(cache.attrsInput);
            }

            if (document.activeElement !== cache.textInput) {
                cache.textInput.value = data.text ?? "";
                autoExpand(cache.textInput);
            }

            const boundEvents = [];
            const connectedAssets = [];
            const connectedStyles = [];
            const outEdges = graph.outEdges(node.id) || [];
            for (const e of outEdges) {
                const dst = graph.getNode(e.dstId);
                if (dst && dst.data.type === "CSS_RULE") {
                    connectedStyles.push({
                        name: dst.data.name ?? dst.id,
                        code: dst.data.code ?? ""
                    });
                } else if (dst && dst.data.type === "JS_EVENT") {
                    boundEvents.push({ 
                        eventName: dst.data.name ?? dst.id,
                        eventType: dst.data.event ?? "click"
                    });
                } else if (dst && (dst.data.type === "ASSET_IMAGE" || dst.data.type === "ASSET_AUDIO")) {
                    connectedAssets.push({
                        icon: dst.data.type === "ASSET_IMAGE" ? "🖼️" : "🎵",
                        filename: dst.data.filename
                    });
                }
            }
            
            cache.boundEventsList.innerHTML = "";
            for (const be of boundEvents) {
                const row = document.createElement("div");
                Object.assign(row.style, {
                    padding: "4px 8px", background: "#18191c", color: "#d8dde8",
                    borderLeft: "3px solid #f7df1e", fontWeight: "bold"
                });
                row.textContent = `[${be.eventType}] ${be.eventName}`;
                cache.boundEventsList.append(row);
            }

            cache.styleList.innerHTML = "";
            if (connectedStyles.length > 0) {
                for (const style of connectedStyles) {
                    const row = document.createElement("div");
                    Object.assign(row.style, {
                        padding: "4px 8px", background: "#18191c", color: "#d8dde8",
                        borderLeft: "3px solid #3b82f6", fontWeight: "bold"
                    });
                    
                    row.textContent = style.name;
                    cache.styleList.append(row);
                }
            } else {
                const empty = document.createElement("div");
                empty.textContent = "No inline style";
                empty.style.color = "#72798a";
                cache.styleList.append(empty);
            }

            cache.assetList.innerHTML = "";
            if (connectedAssets.length > 0) {
                const asset = connectedAssets[0];
                const row = document.createElement("div");
                Object.assign(row.style, {
                    padding: "4px 8px", background: "#18191c", color: "#d8dde8",
                    borderLeft: "3px solid #ffffff", fontWeight: "bold"
                });
                row.textContent = `${asset.icon} ${asset.filename}`;
                cache.assetList.append(row);
            } else {
                const empty = document.createElement("div");
                empty.textContent = "No asset connected";
                empty.style.color = "#72798a";
                cache.assetList.append(empty);
            }
        }
    }
}