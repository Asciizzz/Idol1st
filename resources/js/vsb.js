import { Agraph }                      from "./Alib/Agraph.js";
import { VsGraph, VsCamera, VsDotGrid } from "./Alib/VsGraph/index.js";

import { VsbJSON } from "./VirtualSiteBuilder/JSON.js";
import { VsbCtx }  from "./VirtualSiteBuilder/ctx.js";
import { VsbUI }   from "./VirtualSiteBuilder/ui.js";

function ensureMountElements() {
    const host = document.querySelector("#vsb-app") || document.body;

    let layout = document.querySelector("#main-layout");
    if (!layout) {
        layout = document.createElement("div");
        layout.id = "main-layout";
        Object.assign(layout.style, {
            position: "absolute",
            inset: "0",
            display: "flex",
            overflow: "hidden",
            background: "#0b0b0f",
        });
        host.appendChild(layout);
    }

    let app = document.querySelector("#app");
    if (!app) {
        app = document.createElement("div");
        app.id = "app";
        Object.assign(app.style, {
            position: "relative",
            flex: "1",
            overflow: "hidden",
        });
        layout.appendChild(app);
    }

    return { app };
}

function toGraph(raw) {
    if (!raw) return new Agraph();
    if (typeof raw === "string") {
        try {
            return VsbJSON.read(JSON.parse(raw));
        } catch {
            return new Agraph();
        }
    }
    return VsbJSON.read(raw);
}

const { app } = ensureMountElements();

const graph  = toGraph(window.__VSB_GRAPH__ ?? null);
const camera = new VsCamera();
const vsgraph = new VsGraph({ mount: app, graph, camera });

const dotGrid = new VsDotGrid();
dotGrid.bindVsGraph(vsgraph);

const ctx = new VsbCtx();
vsgraph.ctx = ctx;
vsgraph.render();

window.graph   = graph;
window.vsgraph = vsgraph;
window.ctx     = ctx;
window.ui      = new VsbUI(vsgraph);
window.VSB = {
    remount(rawGraph, draft = null) {
        const nextGraph = toGraph(rawGraph);
        window.__VSB_GRAPH__ = rawGraph;
        window.__VSB_DRAFT__ = draft;

        window.graph = nextGraph;
        window.vsgraph.graph = nextGraph;
        window.vsgraph.render();

        if (window.ui && typeof window.ui.triggerCompile === "function") {
            window.ui.triggerCompile();
        }
    },
};

const token = window.__VSB_TOKEN__;

// Load projects
fetch('/api/projects', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    }
});
