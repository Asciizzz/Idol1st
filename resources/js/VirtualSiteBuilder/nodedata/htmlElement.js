import { VsbNodeType, autoExpand, inputStyle, textAreaStyle, createLabel } from "./node.js";
import { VsbElementData } from "./elementNode.js";

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

        cache.body.append(tagLabel, tagInput, attrsLabel, attrsInput, textLabel, textInput);

        cache.tagInput   = tagInput;
        cache.attrsInput = attrsInput;
        cache.textInput  = textInput;

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
        }
    }
}