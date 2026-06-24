import { VsbNodeType, inputStyle, createLabel } from "./node.js";
import { VsbElementData } from "./elementNode.js";

export class VsbAssetImageData extends VsbElementData {
    constructor({ url = "", filename = "No file chosen", name = "Image Asset", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.ASSET_IMAGE, name, vsgdata });
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

        // Add Image Icon
        const icon = document.createElement("div");
        icon.innerHTML = "🖼️";
        icon.style.marginRight = "6px";
        cache.header.insertBefore(icon, cache.title);

        const fileLabel = createLabel("File Upload");
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        Object.assign(fileInput.style, inputStyle);
        fileInput.style.padding = "2px";
        fileInput.addEventListener("pointerdown", e => e.stopPropagation());
        
        fileInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            node.data.filename = file.name;
            
            // For MVP: use object URL. In production, this posts to /api/assets/upload
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
            padding: "4px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100px"
        });
        const imgPreview = document.createElement("img");
        Object.assign(imgPreview.style, {
            maxWidth: "100%",
            maxHeight: "150px",
            objectFit: "contain",
            borderRadius: "2px"
        });
        previewContainer.appendChild(imgPreview);

        cache.body.append(fileLabel, fileInput, urlLabel, urlDisplay, previewContainer);

        cache.fileInput = fileInput;
        cache.urlDisplay = urlDisplay;
        cache.imgPreview = imgPreview;
        cache.previewContainer = previewContainer;

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache }) {
        VsbElementData.renderFn({ node, element, graph, vsgraph, cache });

        const data = node.data;
        const collapsed = data.vsgdata?.collapsed ?? false;

        if (!collapsed) {
            cache.urlDisplay.textContent = data.url || "No URL generated yet";
            
            if (data.url) {
                cache.imgPreview.src = data.url;
                cache.imgPreview.style.display = "block";
                cache.previewContainer.style.display = "flex";
            } else {
                cache.imgPreview.style.display = "none";
                cache.previewContainer.style.display = "none";
            }
        }
    }
}
