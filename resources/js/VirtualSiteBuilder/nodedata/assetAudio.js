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

        // Override header styling for Asset Node (white bg, black text)
        Object.assign(cache.header.style, {
            background: "#ffffff",
            color: "#000000"
        });
        cache.title.style.color = "#000000";

        // Add Audio Icon
        const icon = document.createElement("div");
        icon.innerHTML = "🎵";
        icon.style.marginRight = "6px";
        cache.header.insertBefore(icon, cache.title);

        const fileLabel = createLabel("File Upload");
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "audio/*";
        Object.assign(fileInput.style, inputStyle);
        fileInput.style.padding = "2px";
        fileInput.addEventListener("pointerdown", e => e.stopPropagation());
        
        fileInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            node.data.filename = file.name;
            
            // For MVP: use object URL
            node.data.url = URL.createObjectURL(file);
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
            cache.urlDisplay.textContent = data.url || "No URL generated yet";
            
            if (data.url && cache.audioPreview.src !== data.url) {
                cache.audioPreview.src = data.url;
            }
            
            if (data.url) {
                cache.previewContainer.style.display = "flex";
            } else {
                cache.previewContainer.style.display = "none";
            }
        }
    }
}
