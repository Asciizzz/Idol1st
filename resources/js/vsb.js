import { Agraph }                      from "./Alib/Agraph.js";
import { VsGraph, VsCamera, VsDotGrid } from "./Alib/VsGraph/index.js";

import { VsbJSON } from "./VirtualSiteBuilder/JSON.js";
import { VsbCtx }  from "./VirtualSiteBuilder/ctx.js";
import { VsbUI }   from "./VirtualSiteBuilder/ui.js";

const raw   = window.__VSB_GRAPH__ ?? null;
const graph = raw ? VsbJSON.read(raw) : new Agraph();

const camera  = new VsCamera();
const vsgraph = new VsGraph({ mount: document.querySelector("#app"), graph, camera });

// Dot grid binds to the same camera and auto-updates on every vsgraph.render()
const dotGrid = new VsDotGrid();
dotGrid.bindVsGraph(vsgraph);

const ctx = new VsbCtx();
vsgraph.ctx = ctx;
vsgraph.render();

// Dev helpers
window.graph   = graph;
window.vsgraph = vsgraph;
window.ctx     = ctx;
window.ui      = new VsbUI(vsgraph);
