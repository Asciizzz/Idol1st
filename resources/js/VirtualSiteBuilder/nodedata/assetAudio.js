import { VsbNodeType, inputStyle, createLabel } from "./node.js";
import { VsbElementData } from "./elementNode.js";

export class VsbAssetAudioData extends VsbElementData {
    constructor({ url = "", filename = "No file chosen", name = "Audio Asset", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.ASSET_AUDIO, name, vsgdata });
        this.url = url;
        this.filename = filename;
    }

    static _defaultWidth() { return 240; }

    static createFn({ node, graph, vsgraph }) {
        const { element, cache } = VsbElementData.createFn({ node, graph, vsgraph });

        // Override header styling for Asset Node
        Object.assign(cache.header.style, {
            background: "#ec4899",
            color: "#ffffff"
        });
        cache.title.style.color = "#ffffff";

        // Add Audio Icon
        const icon = document.createElement("div");
        icon.innerHTML = "🎵";
        icon.style.marginRight = "6px";
        cache.header.insertBefore(icon, cache.title);

        const fileLabel = createLabel("Select Asset");
        const fileInput = document.createElement("select");
        Object.assign(fileInput.style, inputStyle);
        fileInput.style.padding = "4px";
        fileInput.addEventListener("pointerdown", e => e.stopPropagation());
        
        fileInput.addEventListener("change", (e) => {
            node.data.assetId = e.target.value;
            if (vsgraph) vsgraph.render();
        });

        const urlLabel = createLabel("Asset URL");
        const urlDisplay = document.createElement("div");
        Object.assign(urlDisplay.style, {
            ...inputStyle,
            wordBreak: "break-all",
            fontSize: "10px",
            color: "#8b93a7"
        });

        const previewContainer = document.createElement("div");
        Object.assign(previewContainer.style, {
            marginTop: "12px",
            background: "#18191c",
            borderRadius: "4px",
            padding: "8px 4px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
        });
        const audioPreview = document.createElement("audio");
        audioPreview.controls = true;
        Object.assign(audioPreview.style, {
            width: "100%",
            height: "30px"
        });
        previewContainer.appendChild(audioPreview);

        cache.body.append(fileLabel, fileInput, urlLabel, urlDisplay, previewContainer);

        cache.fileInput = fileInput;
        cache.urlDisplay = urlDisplay;
        cache.audioPreview = audioPreview;
        cache.previewContainer = previewContainer;

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache }) {
        VsbElementData.renderFn({ node, element, graph, vsgraph, cache });

        const data = node.data;
        const collapsed = data.vsgdata?.collapsed ?? false;

        if (!collapsed) {
            // Re-populate select options
            cache.fileInput.innerHTML = `<option value="">-- Choose Audio --</option>`;
            if (vsgraph && vsgraph.ctx) {
                for (const [id, asset] of vsgraph.ctx.assets.entries()) {
                    if (asset.type === "audio") {
                        const opt = document.createElement("option");
                        opt.value = id;
                        opt.textContent = asset.filename;
                        if (data.assetId === id) opt.selected = true;
                        cache.fileInput.appendChild(opt);
                    }
                }
            }

            let assetData = null;
            if (data.assetId && vsgraph && vsgraph.ctx) {
                assetData = vsgraph.ctx.getAsset(data.assetId);
            }
            
            // Fallback for pre-existing json without assetId but with url
            const url = assetData ? assetData.url : data.url;

            cache.urlDisplay.textContent = url || "No Asset Selected";
            
            if (url && cache.audioPreview.src !== url) {
                cache.audioPreview.src = url;
            }
            
            if (url) {
                cache.previewContainer.style.display = "flex";
            } else {
                cache.previewContainer.style.display = "none";
            }
        }
    }
}
