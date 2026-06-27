import { Agraph }                      from "./Alib/Agraph.js";
import { VsGraph, VsCamera, VsDotGrid } from "./Alib/VsGraph/index.js";

import { VsbJSON } from "./VirtualSiteBuilder/JSON.js";
import { VsbCtx }  from "./VirtualSiteBuilder/ctx.js";
import { VsbUI }   from "./VirtualSiteBuilder/ui.js";

const raw   = window.__VSB_GRAPH__ ?? null;
const graph = raw ? VsbJSON.read(raw) : new Agraph();

const camera  = new VsCamera();
const vsgraph = new VsGraph({ mount: document.querySelector("#app"), graph, camera });

const dotGrid = new VsDotGrid();
dotGrid.bindVsGraph(vsgraph);

const ctx = new VsbCtx();
vsgraph.ctx = ctx;
vsgraph.render();

window.graph   = graph;
window.vsgraph = vsgraph;
window.ctx     = ctx;
window.ui      = new VsbUI(vsgraph);

const token = window.__VSB_TOKEN__;

// Load projects
fetch('/api/projects', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    }
});
