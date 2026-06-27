import { VsbNodeType, autoExpand, inputStyle, textAreaStyle, createLabel } from "./node.js";
import { VsbElementData } from "./elementNode.js";

export class VsbCssRuleData extends VsbElementData {
    constructor({ selector = "", declarations = {}, code = "", name = "New CSS Rule", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.CSS_RULE, name, vsgdata });
        this.selector     = selector;
        this.declarations = declarations;
        
        if (!code && this.declarations && Object.keys(this.declarations).length > 0) {
            this.code = Object.entries(this.declarations).map(([k,v]) => `${k}: ${v};`).join("\n");
        } else {
            this.code = code;
        }
    }

    static _fileTypeColor() { return "#264de4"; }

    static createFn({ node, graph, vsgraph }) {
        const { element, cache } = VsbElementData.createFn({ node, graph, vsgraph });

        element.style.outlineColor = VsbCssRuleData._fileTypeColor();

        const selectorLabel = createLabel("Selector");
        selectorLabel.style.marginTop = "0";
        const selectorInput = document.createElement("input");
        Object.assign(selectorInput.style, inputStyle);
        selectorInput.addEventListener("pointerdown", e => e.stopPropagation());
        selectorInput.addEventListener("keydown", e => e.stopPropagation());
        selectorInput.addEventListener("change", e => {
            node.data.selector = e.target.value;
            if (vsgraph) vsgraph.render();
        });

        const codeLabel = createLabel("Declarations");
        const codeInput = document.createElement("textarea");
        codeInput.rows = 1;
        Object.assign(codeInput.style, textAreaStyle);
        codeInput.placeholder = 'color: red;\nmargin: 0;';
        codeInput.addEventListener("pointerdown", e => e.stopPropagation());
        codeInput.addEventListener("keydown", e => e.stopPropagation());
        codeInput.addEventListener("input", e => autoExpand(e.target));
        codeInput.addEventListener("change", e => {
            node.data.code = e.target.value;
            if (vsgraph) vsgraph.render();
        });

        cache.body.append(selectorLabel, selectorInput, codeLabel, codeInput);

        cache.selectorInput = selectorInput;
        cache.codeInput     = codeInput;

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache }) {
        VsbElementData.renderFn({ node, element, graph, vsgraph, cache });

        element.style.outlineColor = VsbCssRuleData._fileTypeColor();

        const data = node.data;
        const collapsed = data.vsgdata?.collapsed ?? false;

        if (!collapsed) {
            let isInlineStyle = false;
            if (graph) {
                const inEdges = graph.inEdges(node.id) || [];
                isInlineStyle = inEdges.some(e => {
                    const srcNode = graph.getNode(e.srcId);
                    return srcNode && srcNode.data.type === "ELEMENT";
                });
            }

            if (isInlineStyle) {
                cache.selectorInput.disabled = true;
                cache.selectorInput.style.opacity = "0.5";
                cache.selectorInput.value = "(Inline Style)";
            } else {
                cache.selectorInput.disabled = false;
                cache.selectorInput.style.opacity = "1";
                if (document.activeElement !== cache.selectorInput) {
                    cache.selectorInput.value = data.selector ?? "";
                }
            }

            if (document.activeElement !== cache.codeInput) {
                cache.codeInput.value = data.code ?? "";
                autoExpand(cache.codeInput);
            }
        }
    }
}