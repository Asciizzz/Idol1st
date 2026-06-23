import * as nodetypes from "./nodedata/index.js";

export class VsbUI {
    constructor(vsgraph) {
        this.vsgraph = vsgraph;
        this.ctx = vsgraph.ctx;

        this.container = document.createElement("div");
        Object.assign(this.container.style, {
            position: "absolute",
            top: "20px",
            left: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
            zIndex: "1000",
            userSelect: "none",
            alignItems: "flex-start",
            pointerEvents: "none"
        });

        document.body.appendChild(this.container);

        // Temp edge SVG for drag-and-drop
        this.tempEdgeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        Object.assign(this.tempEdgeSvg.style, {
            position: "fixed",
            top: "0", left: "0", width: "100vw", height: "100vh",
            pointerEvents: "none", zIndex: "9999", display: "none"
        });
        this.tempEdgePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.tempEdgePath.setAttribute("stroke", "#e34c26");
        this.tempEdgePath.setAttribute("stroke-width", "3");
        this.tempEdgePath.setAttribute("fill", "none");
        this.tempEdgePath.setAttribute("stroke-dasharray", "6 6");
        this.tempEdgeSvg.append(this.tempEdgePath);
        document.body.appendChild(this.tempEdgeSvg);

        this.ctx.mode = "CURSOR";
        this.ctx.edgeSrcId = null;
        
        this.addDefault = "ADD_ELEMENT";
        this.edgeDefault = "EDGE_ADD";
        this.activeSubMenu = null;

        this.render();

        window.addEventListener("keydown", this.onKeyDown.bind(this));
        
        let dragStarted = false;
        document.addEventListener("pointerdown", () => { dragStarted = false; }, true);
        document.addEventListener("pointermove", () => { dragStarted = true; }, true);

        document.addEventListener("pointerup", e => {
            if (this.ctx.dragEdgeSrcId) {
                let hoverNodeId = null;
                const el = document.elementFromPoint(e.clientX, e.clientY);
                if (el) {
                    for (const [key, inst] of this.vsgraph._instances) {
                        if (key.startsWith("n:") && inst.element.contains(el)) {
                            hoverNodeId = key.substring(2);
                            break;
                        }
                    }
                }

                if (hoverNodeId && hoverNodeId !== this.ctx.dragEdgeSrcId) {
                    const srcType = this.vsgraph.graph.getNode(this.ctx.dragEdgeSrcId).data.type;
                    const dstType = this.vsgraph.graph.getNode(hoverNodeId).data.type;

                    const validPairs = [
                        ["HTML", "CSS"],
                        ["HTML", "JS"],
                        ["HTML", "ELEMENT"],
                        ["ELEMENT", "ELEMENT"],
                        ["CSS", "CSS_RULE"],
                        ["JS", "JS_EVENT"],
                        ["ELEMENT", "CSS_RULE"],
                        ["ELEMENT", "JS_EVENT"]
                    ];

                    let resolvedSrc = null;
                    let resolvedDst = null;

                    for (const [a, b] of validPairs) {
                        if (srcType === a && dstType === b) { resolvedSrc = this.ctx.dragEdgeSrcId; resolvedDst = hoverNodeId; break; }
                        if (srcType === b && dstType === a) { resolvedSrc = hoverNodeId; resolvedDst = this.ctx.dragEdgeSrcId; break; }
                    }

                    if (resolvedSrc && resolvedDst) {
                        this.vsgraph.graph.addEdge(resolvedSrc, resolvedDst, { data: new nodetypes.VsbEdgeData() });
                        this.vsgraph.render();
                    }
                }
                
                this.ctx.dragEdgeSrcId = null;
                this.tempEdgeSvg.style.display = "none";
            }

            if (this.container.contains(e.target) && e.target !== this.container) return;

            let clickedNodeId = null;
            for (const [key, inst] of this.vsgraph._instances) {
                if (key.startsWith("n:") && inst.element.contains(e.target)) clickedNodeId = key.substring(2);
            }

            if (this.ctx.mode === "CURSOR" && !dragStarted) {
                if (clickedNodeId) {
                    const node = this.vsgraph.graph.getNode(clickedNodeId);
                    const type = node.data.type;
                    if (type === "HTML" || type === "CSS" || type === "JS") {
                        this.ctx.selectedFileNodeId = clickedNodeId;
                        this.render();
                    }
                }
            }
        });

        document.addEventListener("pointerdown", e => {
            if (this.container.contains(e.target) && e.target !== this.container) return;

            let clickedNodeId = null;
            let clickedEdgeId = null;
            
            for (const [key, inst] of this.vsgraph._instances) {
                if (key.startsWith("n:") && inst.element.contains(e.target)) clickedNodeId = key.substring(2);
                if (key.startsWith("e:") && inst.element.contains(e.target)) clickedEdgeId = key.substring(2);
            }

            const worldPos = () => {
                const rect = this.vsgraph.root.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const localX = e.clientX - rect.left;
                const localY = e.clientY - rect.top;
                const cam = this.vsgraph.camera;
                return {
                    x: (localX - centerX - cam.x) / cam.zoom,
                    y: (localY - centerY - cam.y) / cam.zoom
                };
            };

            const addNodeAtClick = (TypeClass) => {
                const node = this.vsgraph.graph.addNode({ data: new TypeClass() });
                const pos = worldPos();
                node.data.vsgdata.x = pos.x;
                node.data.vsgdata.y = pos.y;
                this.vsgraph.render();
            };

            if (this.ctx.mode === "DELETE") {
                if (clickedNodeId) {
                    this.vsgraph.graph.removeNode(clickedNodeId);
                    this.vsgraph.render();
                    e.preventDefault();
                    e.stopPropagation();
                } else if (clickedEdgeId) {
                    this.vsgraph.graph.removeEdge(clickedEdgeId);
                    this.vsgraph.render();
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else if (this.ctx.mode === "EDGE_ADD") {
                if (clickedNodeId) {
                    this.ctx.dragEdgeSrcId = clickedNodeId;
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else if (this.ctx.mode === "EDGE_PAINT") {
                if (clickedEdgeId && this.ctx.selectedFileNodeId) {
                    const edge = this.vsgraph.graph.getEdge(clickedEdgeId);
                    if (edge && edge.data.rootId !== this.ctx.selectedFileNodeId) {
                        edge.data.rootId = this.ctx.selectedFileNodeId;
                        this.vsgraph.render();
                    }
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else if (this.ctx.mode.startsWith("ADD_")) {
                if (!clickedNodeId && !clickedEdgeId) {
                    const type = this.ctx.mode.substring(4);
                    if (type === "HTML") addNodeAtClick(nodetypes.VsbHtmlFileData);
                    else if (type === "CSS") addNodeAtClick(nodetypes.VsbCssFileData);
                    else if (type === "JS") addNodeAtClick(nodetypes.VsbJsFileData);
                    else if (type === "ELEMENT") addNodeAtClick(nodetypes.VsbHtmlElementData);
                    else if (type === "CSS_RULE") addNodeAtClick(nodetypes.VsbCssRuleData);
                    else if (type === "JS_EVENT") addNodeAtClick(nodetypes.VsbJsEventData);
                    e.preventDefault();
                }
            }
        }, true); 

        document.addEventListener("pointermove", e => {
            if (this.ctx.mode === "EDGE_ADD" && this.ctx.dragEdgeSrcId && e.buttons === 1) {
                const srcNodeEl = this.vsgraph._instances.get(`n:${this.ctx.dragEdgeSrcId}`)?.element;
                if (srcNodeEl) {
                    const rect = srcNodeEl.getBoundingClientRect();
                    const srcX = rect.left + rect.width / 2;
                    const srcY = rect.top + rect.height / 2;
                    this.tempEdgePath.setAttribute("d", `M ${srcX} ${srcY} L ${e.clientX} ${e.clientY}`);
                    this.tempEdgeSvg.style.display = "block";
                }
            } else {
                this.tempEdgeSvg.style.display = "none";
            }

            if (this.ctx.mode === "EDGE_PAINT" && e.buttons === 1 && this.ctx.selectedFileNodeId) {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                if (!el) return;
                
                let hoverEdgeId = null;
                for (const [key, inst] of this.vsgraph._instances) {
                    if (key.startsWith("e:") && inst.element.contains(el)) {
                        hoverEdgeId = key.substring(2);
                        break;
                    }
                }
                if (hoverEdgeId) {
                    const edge = this.vsgraph.graph.getEdge(hoverEdgeId);
                    if (edge && edge.data.rootId !== this.ctx.selectedFileNodeId) {
                        edge.data.rootId = this.ctx.selectedFileNodeId;
                        this.vsgraph.render();
                    }
                }
            }
        });
    }

    setMode(mode) {
        if (this.ctx.mode === mode) return;
        this.ctx.mode = mode;
        this.ctx.dragEdgeSrcId = null;
        this.tempEdgeSvg.style.display = "none";
        this.render();
        this.vsgraph.render();
    }

    onKeyDown(e) {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

        const key = e.key.toLowerCase();

        if (key === "escape") {
            this.setMode("CURSOR");
            this.activeSubMenu = null;
            this.render();
            return;
        }

        if (this.activeSubMenu === "ADD") {
            if (key === "1") { this.addDefault = "ADD_HTML"; this.setMode(this.addDefault); }
            else if (key === "2") { this.addDefault = "ADD_CSS"; this.setMode(this.addDefault); }
            else if (key === "3") { this.addDefault = "ADD_JS"; this.setMode(this.addDefault); }
            else if (key === "4") { this.addDefault = "ADD_ELEMENT"; this.setMode(this.addDefault); }
            else if (key === "5") { this.addDefault = "ADD_CSS_RULE"; this.setMode(this.addDefault); }
            else if (key === "6") { this.addDefault = "ADD_JS_EVENT"; this.setMode(this.addDefault); }
            
            this.activeSubMenu = null;
            this.render();
            return;
        } else if (this.activeSubMenu === "EDGE") {
            if (key === "1") { this.edgeDefault = "EDGE_ADD"; this.setMode(this.edgeDefault); }
            else if (key === "2") { this.edgeDefault = "EDGE_PAINT"; this.setMode(this.edgeDefault); }
            
            this.activeSubMenu = null;
            this.render();
            return;
        }

        if (key === "1") {
            this.setMode("CURSOR");
            this.activeSubMenu = null;
        } else if (key === "2") {
            if (this.ctx.mode.startsWith("ADD_")) {
                this.activeSubMenu = this.activeSubMenu === "ADD" ? null : "ADD";
            } else {
                this.setMode(this.addDefault);
            }
        } else if (key === "3") {
            if (this.ctx.mode.startsWith("EDGE_")) {
                this.activeSubMenu = this.activeSubMenu === "EDGE" ? null : "EDGE";
            } else {
                this.setMode(this.edgeDefault);
            }
        } else if (key === "4") {
            this.setMode("DELETE");
            this.activeSubMenu = null;
        } else if (key === "5" || key === "n") {
            this.ctx.showNodeInputs = !this.ctx.showNodeInputs;
            this.vsgraph.render();
            this.render();
        } else if (key === "6") {
            this.ctx.showEdgeInputs = !this.ctx.showEdgeInputs;
            this.render();
            this.vsgraph.render();
        } else if (key === "7") {
            this.ctx.showEventEdges = !this.ctx.showEventEdges;
            this.render();
            this.vsgraph.render();
        }
        
        this.render();
    }

    render() {
        this.container.innerHTML = "";

        const headerRow = document.createElement("div");
        Object.assign(headerRow.style, {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(0, 0, 0, 0.95)",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "2px solid #333",
            color: "#fff",
            fontSize: "12px",
            pointerEvents: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)"
        });
        
        let selName = "None";
        if (this.ctx.selectedFileNodeId) {
            const node = this.vsgraph.graph.getNode(this.ctx.selectedFileNodeId);
            if (node) {
                const color = node.data.vsgdata?.fileColor ?? node.data.constructor._fileTypeColor?.() ?? "#fff";
                selName = `<span style="color:${color};font-weight:bold;">${node.data.name ?? node.id} (${node.data.type})</span>`;
            }
        }
        
        const selText = document.createElement("div");
        selText.innerHTML = `Selected Node: ${selName}`;
        headerRow.append(selText);

        if (this.ctx.mode !== "CURSOR" || this.activeSubMenu) {
            const separator = document.createElement("div");
            separator.textContent = "|";
            separator.style.color = "#666";
            
            const modeText = document.createElement("div");
            modeText.style.color = "#fff";
            modeText.style.fontWeight = "bold";
            
            if (this.activeSubMenu === "ADD") modeText.textContent = `Mode: Add > ...`;
            else if (this.activeSubMenu === "EDGE") modeText.textContent = `Mode: Edge > ...`;
            else if (this.ctx.mode.startsWith("ADD_")) modeText.textContent = `Mode: Add > ${this.ctx.mode.substring(4)}`;
            else if (this.ctx.mode.startsWith("EDGE_")) modeText.textContent = `Mode: Edge > ${this.ctx.mode.substring(5)}`;
            else if (this.ctx.mode === "DELETE") modeText.textContent = `Mode: Delete`;
            
            headerRow.append(separator, modeText);
        }

        this.container.append(headerRow);

        const toolbarRow = document.createElement("div");
        Object.assign(toolbarRow.style, {
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            pointerEvents: "none"
        });

        const mainCol = document.createElement("div");
        Object.assign(mainCol.style, {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            pointerEvents: "none"
        });
        
        toolbarRow.append(mainCol);

        const createIconBtn = (iconSvg, hotkey, active, onClick, defaultLabel = null) => {
            const wrapper = document.createElement("div");
            Object.assign(wrapper.style, {
                position: "relative",
                width: "42px",
                height: "42px"
            });

            const btn = document.createElement("div");
            Object.assign(btn.style, {
                boxSizing: "border-box",
                width: "100%",
                height: "100%",
                borderRadius: "6px",
                cursor: "pointer",
                background: active ? "#ffffff" : "#0a0a0a",
                color: active ? "#000000" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.1s, color 0.1s",
                border: active ? "2px solid #ffffff" : "2px solid #333",
                position: "relative",
                pointerEvents: "auto",
                boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                backdropFilter: "blur(8px)"
            });
            
            btn.addEventListener("pointerenter", () => {
                if (!active) btn.style.background = "#1a1a1a";
            });
            btn.addEventListener("pointerleave", () => {
                if (!active) btn.style.background = "#0a0a0a";
            });

            const svgWrap = document.createElement("div");
            svgWrap.innerHTML = iconSvg;
            Object.assign(svgWrap.style, {
                width: "20px", height: "20px", display: "flex",
                alignItems: "center", justifyContent: "center"
            });
            const svgEl = svgWrap.firstElementChild;
            if (svgEl) {
                svgEl.style.width = "100%";
                svgEl.style.height = "100%";
            }
            btn.append(svgWrap);

            if (hotkey) {
                const keyTag = document.createElement("div");
                keyTag.textContent = hotkey;
                Object.assign(keyTag.style, {
                    position: "absolute",
                    top: "3px",
                    left: "3px",
                    background: active ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)",
                    color: active ? "#000" : "#fff",
                    width: "12px",
                    height: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "2px",
                    fontSize: "8px",
                    fontWeight: "900"
                });
                btn.append(keyTag);
            }

            if (defaultLabel) {
                const labelTag = document.createElement("div");
                labelTag.textContent = defaultLabel;
                Object.assign(labelTag.style, {
                    position: "absolute",
                    top: "50%",
                    left: "calc(100% - 4px)",
                    transform: "translateY(-50%)",
                    background: "#e34c26",
                    color: "#fff",
                    padding: "2px 10px 2px 12px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)",
                    zIndex: "-1"
                });
                wrapper.append(labelTag);
            }
            
            wrapper.append(btn);
            btn.addEventListener("click", onClick);
            return wrapper;
        };

        const cursorSvg = `<svg viewBox="0 0 24 24"><path d="M7 2l12 11.2-5.8.5 3.3 7.3-2.25 1-3.2-7.4-4.4 4.7z" fill="currentColor"/></svg>`;
        const addSvg = `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>`;
        const delSvg = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>`;
        const edgeSvg = `<svg viewBox="0 0 24 24"><path d="M16 11V5h-6v2h4.59L6.5 15.09V13H5v6h6v-2H6.41L14.5 8.91V11h1.5z" fill="currentColor"/></svg>`;
        const nodeInputSvg = `<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z" fill="currentColor"/></svg>`;
        const edgeInputSvg = `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>`;

        const getAddLabel = (mode) => {
            switch(mode) {
                case "ADD_HTML": return "HTML";
                case "ADD_CSS": return "CSS";
                case "ADD_JS": return "JS";
                case "ADD_ELEMENT": return "HTML Element";
                case "ADD_CSS_RULE": return "CSS Rule";
                case "ADD_JS_EVENT": return "JS Event";
                default: return "";
            }
        };

        const getEdgeLabel = (mode) => {
            switch(mode) {
                case "EDGE_ADD": return "Add";
                case "EDGE_PAINT": return "Paint";
                default: return "";
            }
        };

        const separator = document.createElement("div");
        Object.assign(separator.style, {
            width: "30px",
            height: "2px",
            background: "#333",
            margin: "4px auto",
            borderRadius: "1px"
        });

        mainCol.append(
            createIconBtn(cursorSvg, "1", this.ctx.mode === "CURSOR", () => {
                this.setMode("CURSOR");
                this.activeSubMenu = null;
                this.render();
            }),
            createIconBtn(addSvg, "2", this.ctx.mode.startsWith("ADD_"), () => {
                if (this.ctx.mode.startsWith("ADD_")) {
                    this.activeSubMenu = this.activeSubMenu === "ADD" ? null : "ADD";
                } else {
                    this.setMode(this.addDefault);
                    this.activeSubMenu = null;
                }
                this.render();
            }, this.activeSubMenu === "ADD" ? null : getAddLabel(this.addDefault)),
            createIconBtn(edgeSvg, "3", this.ctx.mode.startsWith("EDGE_"), () => {
                if (this.ctx.mode.startsWith("EDGE_")) {
                    this.activeSubMenu = this.activeSubMenu === "EDGE" ? null : "EDGE";
                } else {
                    this.setMode(this.edgeDefault);
                    this.activeSubMenu = null;
                }
                this.render();
            }, this.activeSubMenu === "EDGE" ? null : getEdgeLabel(this.edgeDefault)),
            createIconBtn(delSvg, "4", this.ctx.mode === "DELETE", () => {
                this.setMode("DELETE");
                this.activeSubMenu = null;
                this.render();
            }),
            separator,
            createIconBtn(nodeInputSvg, "5", this.ctx.showNodeInputs, () => {
                this.ctx.showNodeInputs = !this.ctx.showNodeInputs;
                this.render();
                this.vsgraph.render();
            }),
            createIconBtn(edgeInputSvg, "6", this.ctx.showEdgeInputs, () => {
                this.ctx.showEdgeInputs = !this.ctx.showEdgeInputs;
                this.render();
                this.vsgraph.render();
            }),
            createIconBtn(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`, "7", this.ctx.showEventEdges, () => {
                this.ctx.showEventEdges = !this.ctx.showEventEdges;
                this.render();
                this.vsgraph.render();
            })
        );

        if (this.activeSubMenu) {
            const subRow = document.createElement("div");
            Object.assign(subRow.style, {
                display: "flex",
                gap: "8px",
                background: "rgba(0, 0, 0, 0.95)",
                padding: "8px",
                borderRadius: "6px",
                border: "2px solid #333",
                pointerEvents: "auto",
                boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
                backdropFilter: "blur(8px)",
                marginTop: this.activeSubMenu === "ADD" ? "50px" : "100px"
            });
            
            const createSubBtn = (label, hotkey, active, onClick) => {
                const btn = document.createElement("div");
                Object.assign(btn.style, {
                    boxSizing: "border-box",
                    padding: "6px 10px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: active ? "#ffffff" : "#0a0a0a",
                    color: active ? "#000000" : "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: "bold",
                    transition: "background 0.1s, color 0.1s",
                    border: active ? "2px solid #ffffff" : "2px solid #333"
                });
                
                btn.addEventListener("pointerenter", () => {
                    if (!active) btn.style.background = "#1a1a1a";
                });
                btn.addEventListener("pointerleave", () => {
                    if (!active) btn.style.background = "#0a0a0a";
                });

                if (hotkey) {
                    const keyTag = document.createElement("span");
                    keyTag.textContent = hotkey;
                    Object.assign(keyTag.style, {
                        background: active ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)",
                        color: active ? "#000" : "#fff",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontSize: "11px",
                        fontWeight: "900"
                    });
                    btn.append(keyTag);
                }
                btn.append(document.createTextNode(label));
                btn.addEventListener("click", onClick);
                return btn;
            };

            if (this.activeSubMenu === "ADD") {
                subRow.append(
                    createSubBtn("HTML", "1", this.ctx.mode === "ADD_HTML", () => { this.addDefault = "ADD_HTML"; this.setMode("ADD_HTML"); this.activeSubMenu = null; }),
                    createSubBtn("CSS", "2", this.ctx.mode === "ADD_CSS", () => { this.addDefault = "ADD_CSS"; this.setMode("ADD_CSS"); this.activeSubMenu = null; }),
                    createSubBtn("JS", "3", this.ctx.mode === "ADD_JS", () => { this.addDefault = "ADD_JS"; this.setMode("ADD_JS"); this.activeSubMenu = null; }),
                    createSubBtn("HTML Element", "4", this.ctx.mode === "ADD_ELEMENT", () => { this.addDefault = "ADD_ELEMENT"; this.setMode("ADD_ELEMENT"); this.activeSubMenu = null; }),
                    createSubBtn("CSS Rule", "5", this.ctx.mode === "ADD_CSS_RULE", () => { this.addDefault = "ADD_CSS_RULE"; this.setMode("ADD_CSS_RULE"); this.activeSubMenu = null; }),
                    createSubBtn("JS Event", "6", this.ctx.mode === "ADD_JS_EVENT", () => { this.addDefault = "ADD_JS_EVENT"; this.setMode("ADD_JS_EVENT"); this.activeSubMenu = null; })
                );
            } else if (this.activeSubMenu === "EDGE") {
                subRow.append(
                    createSubBtn("Add", "1", this.ctx.mode === "EDGE_ADD", () => { this.edgeDefault = "EDGE_ADD"; this.setMode("EDGE_ADD"); this.activeSubMenu = null; }),
                    createSubBtn("Paint", "2", this.ctx.mode === "EDGE_PAINT", () => { this.edgeDefault = "EDGE_PAINT"; this.setMode("EDGE_PAINT"); this.activeSubMenu = null; })
                );
            }
            toolbarRow.append(subRow);
        }

        this.container.append(toolbarRow);
    }
}
