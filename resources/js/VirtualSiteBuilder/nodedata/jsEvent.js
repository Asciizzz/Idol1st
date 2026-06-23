import { VsbNodeType, autoExpand, inputStyle, textAreaStyle, createLabel } from "./node.js";
import { VsbElementData } from "./elementNode.js";

export class VsbJsEventData extends VsbElementData {
    constructor({ event = "click", code = "", name = "New JS Event", vsgdata = {} } = {}) {
        super({ type: VsbNodeType.JS_EVENT, name, vsgdata });
        this.event = event;
        this.code  = code;
    }

    static _fileTypeColor() { return "#f7df1e"; }
    static _defaultWidth() { return 380; } // Double width

    static createFn({ node, graph, vsgraph } = {}) {
        const { element, cache } = VsbElementData.createFn({ node, graph, vsgraph });

        element.style.outlineColor = VsbJsEventData._fileTypeColor();

        const eventLabel = createLabel("Event Trigger");
        eventLabel.style.marginTop = "0";
        const eventSelect = document.createElement("select");
        Object.assign(eventSelect.style, inputStyle);
        eventSelect.style.padding = "2px 2px";
        eventSelect.style.cursor  = "pointer";
        
        const events = [
            "click", "dblclick", "pointerdown", "pointerup", "pointerenter", 
            "pointerleave", "pointermove", "input", "change", "keydown", 
            "keyup", "submit", "focus", "blur", "wheel", "contextmenu"
        ];
        for (const ev of events) {
            const opt = document.createElement("option");
            opt.value = ev;
            opt.textContent = ev;
            eventSelect.append(opt);
        }

        eventSelect.addEventListener("pointerdown", e => e.stopPropagation());
        eventSelect.addEventListener("keydown", e => e.stopPropagation());
        eventSelect.addEventListener("change", e => {
            node.data.event = e.target.value;
            if (vsgraph) vsgraph.render();
        });

        const codeLabel = createLabel("Javascript Code");
        const codeInput = document.createElement("textarea");
        codeInput.rows = 1;
        Object.assign(codeInput.style, textAreaStyle);
        codeInput.placeholder = 'console.log("fired");';
        codeInput.addEventListener("pointerdown", e => e.stopPropagation());
        codeInput.addEventListener("keydown", e => e.stopPropagation());
        codeInput.addEventListener("input", e => autoExpand(e.target));
        codeInput.addEventListener("change", e => {
            node.data.code = e.target.value;
            if (vsgraph) vsgraph.render();
        });

        cache.body.append(eventLabel, eventSelect, codeLabel, codeInput);

        cache.eventSelect = eventSelect;
        cache.codeInput   = codeInput;

        return { element, cache };
    }

    static renderFn({ node, element, graph, vsgraph, cache, ctx }) {
        VsbElementData.renderFn({ node, element, graph, vsgraph, cache, ctx });

        element.style.outlineColor = VsbJsEventData._fileTypeColor();

        const data = node.data;
        const collapsed = data.vsgdata?.collapsed ?? false;

        if (!collapsed) {
            if (document.activeElement !== cache.eventSelect) {
                cache.eventSelect.value = data.event ?? "click";
            }

            if (document.activeElement !== cache.codeInput) {
                cache.codeInput.value = data.code ?? "";
                autoExpand(cache.codeInput);
            }
        }
    }
}