import * as nodetypes from "./nodedata/index.js";
import { VsbCompiler } from "./compiler.js";

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

        document.getElementById('app').appendChild(this.container);

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
        document.getElementById('app').appendChild(this.tempEdgeSvg);

        this.ctx.mode = "CURSOR";
        this.ctx.edgeSrcId = null;
        
        this.addDefault = "ADD_ELEMENT";
        this.edgeDefault = "EDGE_ADD";
        this.activeSubMenu = null;

        // Setup Preview Panel
        this.previewPanelWidth = 50;
        this.previewLogHeight = 150;
        this.previewActiveHtml = null;

        this.previewPanel = document.createElement("div");
        Object.assign(this.previewPanel.style, {
            position: "relative", width: `${this.previewPanelWidth}%`,
            background: "#1e1e21", borderLeft: "2px solid #3a3b40",
            display: "flex", flexDirection: "column", zIndex: "900",
            pointerEvents: "auto", boxShadow: "-4px 0 16px rgba(0,0,0,0.5)",
            fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
        });

        this.previewResizerX = document.createElement("div");
        Object.assign(this.previewResizerX.style, {
            position: "absolute", top: "0", left: "-4px", bottom: "0", width: "8px",
            cursor: "ew-resize", zIndex: "901", background: "transparent"
        });
        this.previewPanel.append(this.previewResizerX);

        this.previewTabs = document.createElement("div");
        Object.assign(this.previewTabs.style, {
            display: "flex", background: "#111112", borderBottom: "1px solid #3a3b40", padding: "8px 8px 0 8px", gap: "4px"
        });

        this.previewContent = document.createElement("div");
        Object.assign(this.previewContent.style, {
            flex: "1", position: "relative", background: "#18191c"
        });

        this.previewPanel.append(this.previewTabs, this.previewContent);
        document.getElementById('main-layout').appendChild(this.previewPanel);

        this.previewActiveTab = "preview";
        this.previewActiveTab = "preview";
        this.compiledData = null;
        this.compileTimer = null;

        this.triggerCompile = () => {
            if (this.compileTimer) clearTimeout(this.compileTimer);
            this.compileTimer = setTimeout(() => {
                this.compiledData = VsbCompiler.compile(this.vsgraph.graph, this.vsgraph.ctx);
                this.renderPreviewContent();
            }, 100);
        };

        this.vsgraph.root.addEventListener("change", () => this.triggerCompile());

        this.isResizingX = false;
        this.isResizingY = false;

        this.previewResizerX.addEventListener("pointerdown", (e) => {
            this.isResizingX = true;
            e.preventDefault();
        });

        document.addEventListener("pointermove", (e) => {
            if (this.isResizingX) {
                let newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
                newWidth = Math.max(10, Math.min(newWidth, 90));
                this.previewPanelWidth = newWidth;
                this.previewPanel.style.width = `${newWidth}%`;
                if (this.currentIframe) this.currentIframe.style.pointerEvents = "none";
            }
            if (this.isResizingY) {
                let newHeight = window.innerHeight - e.clientY;
                newHeight = Math.max(20, Math.min(newHeight, window.innerHeight - 100));
                this.previewLogHeight = newHeight;
                if (this.currentLogDiv) this.currentLogDiv.style.height = `${newHeight}px`;
                if (this.currentIframe) this.currentIframe.style.pointerEvents = "none";
            }
        });

        document.addEventListener("pointerup", () => {
            this.isResizingX = false;
            this.isResizingY = false;
            if (this.currentIframe) this.currentIframe.style.pointerEvents = "auto";
        });

        // Disable default context menu across the editor
        document.addEventListener("contextmenu", e => e.preventDefault());

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
                        ["ELEMENT", "JS_EVENT"],
                        ["ELEMENT", "ASSET_IMAGE"],
                        ["ELEMENT", "ASSET_AUDIO"]
                    ];

                    let resolvedSrc = null;
                    let resolvedDst = null;

                    for (const [a, b] of validPairs) {
                        if (srcType === a && dstType === b) { resolvedSrc = this.ctx.dragEdgeSrcId; resolvedDst = hoverNodeId; break; }
                        if (srcType === b && dstType === a) { resolvedSrc = hoverNodeId; resolvedDst = this.ctx.dragEdgeSrcId; break; }
                    }

                    if (resolvedSrc && resolvedDst) {
                        const srcNode = this.vsgraph.graph.getNode(resolvedSrc);
                        const dstNode = this.vsgraph.graph.getNode(resolvedDst);
                        if (srcNode.data.type === "ELEMENT" && dstNode.data.type.startsWith("ASSET_")) {
                            const outEdges = this.vsgraph.graph.outEdges(resolvedSrc) || [];
                            for (const e of outEdges) {
                                const eDst = this.vsgraph.graph.getNode(e.dstId);
                                if (eDst && eDst.data.type.startsWith("ASSET_")) {
                                    this.vsgraph.graph.removeEdge(e.id);
                                }
                            }
                        }
                        const newEdgeData = new nodetypes.VsbEdgeData();
                        if (this.ctx.selectedFileNodeId) {
                            newEdgeData.rootId = this.ctx.selectedFileNodeId;
                        }
                        this.vsgraph.graph.addEdge(resolvedSrc, resolvedDst, { data: newEdgeData });
                        this.vsgraph.render();
                        this.triggerCompile();
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
                this.triggerCompile();
            };

            if (this.ctx.mode === "DELETE" && e.button === 0) {
                if (clickedNodeId) {
                    this.vsgraph.graph.removeNode(clickedNodeId);
                    this.vsgraph.render();
                    this.triggerCompile();
                    e.preventDefault();
                    e.stopPropagation();
                } else if (clickedEdgeId) {
                    this.vsgraph.graph.removeEdge(clickedEdgeId);
                    this.vsgraph.render();
                    this.triggerCompile();
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else if (this.ctx.mode === "EDGE_ADD" && e.button === 0) {
                if (clickedNodeId) {
                    this.ctx.dragEdgeSrcId = clickedNodeId;
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else if (this.ctx.mode === "EDGE_PAINT" && e.button === 0) {
                if (clickedEdgeId && this.ctx.selectedFileNodeId) {
                    const edge = this.vsgraph.graph.getEdge(clickedEdgeId);
                    if (edge && edge.data.rootId !== this.ctx.selectedFileNodeId) {
                        edge.data.rootId = this.ctx.selectedFileNodeId;
                        this.vsgraph.render();
                        this.triggerCompile();
                    }
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else if (this.ctx.mode.startsWith("ADD_")) {
                if (e.button === 2 && clickedNodeId) {
                    this.vsgraph.graph.removeNode(clickedNodeId);
                    this.vsgraph.render();
                    this.triggerCompile();
                    e.preventDefault();
                    e.stopPropagation();
                } else if (e.button === 0 && !clickedNodeId && !clickedEdgeId) {
                    const type = this.ctx.mode.substring(4);
                    if (type === "HTML") addNodeAtClick(nodetypes.VsbHtmlFileData);
                    else if (type === "CSS") addNodeAtClick(nodetypes.VsbCssFileData);
                    else if (type === "JS") addNodeAtClick(nodetypes.VsbJsFileData);
                    else if (type === "ELEMENT") addNodeAtClick(nodetypes.VsbHtmlElementData);
                    else if (type === "CSS_RULE") addNodeAtClick(nodetypes.VsbCssRuleData);
                    else if (type === "JS_EVENT") addNodeAtClick(nodetypes.VsbJsEventData);
                    else if (type === "ASSET_IMAGE") addNodeAtClick(nodetypes.VsbAssetImageData);
                    else if (type === "ASSET_AUDIO") addNodeAtClick(nodetypes.VsbAssetAudioData);
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
                        this.triggerCompile();
                    }
                }
            }
        });
    }

    renderPreviewContent() {
        if (!this.compiledData) return;

        this.previewTabs.innerHTML = "";
        const tabs = ["preview", "html", "css", "js", "assets"];
        
        for (const tab of tabs) {
            const btn = document.createElement("div");
            btn.textContent = tab.toUpperCase();
            Object.assign(btn.style, {
                padding: "6px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "12px",
                background: this.previewActiveTab === tab ? "#1e1e21" : "transparent",
                color: this.previewActiveTab === tab ? "#fff" : "#8b93a7",
                borderTopLeftRadius: "4px", borderTopRightRadius: "4px",
                border: "1px solid transparent",
                borderBottom: "none"
            });
            if (this.previewActiveTab === tab) {
                btn.style.borderColor = "#3a3b40";
            }
            btn.onclick = () => {
                this.previewActiveTab = tab;
                this.renderPreviewContent();
            };
            this.previewTabs.append(btn);
        }

        const spacer = document.createElement("div");
        spacer.style.flex = "1";
        this.previewTabs.append(spacer);

        const htmlFileNames = Object.keys(this.compiledData.htmlFiles);
        if (!this.previewActiveHtml || !htmlFileNames.includes(this.previewActiveHtml)) {
            this.previewActiveHtml = htmlFileNames[0] || null;
        }

        if (htmlFileNames.length > 0) {
            const selectHtml = document.createElement("select");
            Object.assign(selectHtml.style, {
                background: "#18191c", color: "#d8dde8", border: "1px solid #3a3b40",
                padding: "2px 6px", fontSize: "11px", outline: "none", borderRadius: "3px",
                marginRight: "8px", alignSelf: "center", cursor: "pointer"
            });
            for (const fn of htmlFileNames) {
                const opt = document.createElement("option");
                opt.value = fn;
                opt.textContent = fn;
                if (fn === this.previewActiveHtml) opt.selected = true;
                selectHtml.append(opt);
            }
            selectHtml.onchange = (e) => {
                this.previewActiveHtml = e.target.value;
                this.renderPreviewContent();
            };
            this.previewTabs.append(selectHtml);
        }

        this.previewContent.innerHTML = "";
        
        if (!this.compiledData) {
            this.previewContent.innerHTML = "<div style='color: #8b93a7; padding: 20px; text-align: center; font-style: italic;'>Graph is empty. Start adding nodes to compile the site.</div>";
            return;
        }
        
        const createTextArea = (val) => {
            const ta = document.createElement("textarea");
            Object.assign(ta.style, {
                position: "absolute", top: "0", left: "0", right: "0", bottom: "0",
                width: "100%", height: "100%", boxSizing: "border-box", padding: "16px",
                background: "transparent", color: "#d8dde8", border: "none", outline: "none",
                resize: "none", fontFamily: "inherit", fontSize: "12px", whiteSpace: "pre"
            });
            ta.readOnly = true;
            ta.value = val;
            return ta;
        };

        if (this.previewActiveTab === "preview") {
            const wrapper = document.createElement("div");
            Object.assign(wrapper.style, {
                position: "absolute", top: "0", left: "0", right: "0", bottom: "0",
                display: "flex", flexDirection: "column"
            });

            this.currentIframe = document.createElement("iframe");
            Object.assign(this.currentIframe.style, {
                flex: "1", border: "none", background: "#fff", width: "100%"
            });
            this.currentIframe.srcdoc = VsbCompiler.generatePreviewHtml(this.compiledData, this.previewActiveHtml);
            wrapper.append(this.currentIframe);

            const resizerWrapper = document.createElement("div");
            Object.assign(resizerWrapper.style, { position: "relative" });

            const logResizer = document.createElement("div");
            Object.assign(logResizer.style, {
                position: "absolute", top: "-4px", left: "0", right: "0", height: "8px",
                cursor: "ns-resize", zIndex: "10", background: "transparent"
            });
            logResizer.addEventListener("pointerdown", (e) => {
                this.isResizingY = true;
                e.preventDefault();
            });
            resizerWrapper.append(logResizer);
            wrapper.append(resizerWrapper);

            this.currentLogDiv = document.createElement("div");
            Object.assign(this.currentLogDiv.style, { 
                height: `${this.previewLogHeight}px`, borderTop: "2px solid #3a3b40",
                padding: "8px", display: "flex", flexDirection: "column", gap: "4px",
                overflowY: "auto", background: "#111112", fontSize: "11px"
            });
            if (this.compiledData.logs.length === 0) {
                this.currentLogDiv.innerHTML = "<span style='color: #8b93a7; font-style: italic;'>[Console] Build successful. No warnings.</span>";
            } else {
                for (const log of this.compiledData.logs) {
                    const l = document.createElement("div");
                    l.textContent = `[${log.level.toUpperCase()}] ${log.msg}`;
                    l.style.color = log.level === "warn" ? "#f7df1e" : "#ff4d4d";
                    this.currentLogDiv.append(l);
                }
            }
            wrapper.append(this.currentLogDiv);
            this.previewContent.append(wrapper);
        } else if (this.previewActiveTab === "assets") {
            const assetManagerContainer = document.createElement("div");
            Object.assign(assetManagerContainer.style, {
                padding: "20px", color: "#fff", display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box"
            });
            
            assetManagerContainer.innerHTML = `
                <h3 style="margin-top: 0;">Global Asset Manager</h3>
                <p style="font-size: 11px; color: #8b93a7;">Upload assets here to make them available to your ASSET nodes.</p>
                <div style="border: 2px dashed #666; padding: 30px 20px; text-align: center; border-radius: 8px; cursor: pointer; margin-bottom: 20px; background: rgba(255,255,255,0.05);" id="vsb-asset-dropzone">
                    <div style="font-size: 24px; margin-bottom: 8px;">☁️</div>
                    <div style="font-weight: bold;">Click or Drag to Upload</div>
                    <div style="font-size: 10px; color: #8b93a7; margin-top: 4px;">Supports Images & Audio</div>
                    <input type="file" id="vsb-asset-upload-input" style="display: none;" multiple accept="image/*,audio/*" />
                </div>
                <h4 style="margin-bottom: 10px;">Available Assets</h4>
                <div id="vsb-asset-list" style="display: flex; flex-direction: column; gap: 10px; overflow-y: auto; flex: 1;"></div>
            `;
            this.previewContent.append(assetManagerContainer);
            
            const fileInput = assetManagerContainer.querySelector("#vsb-asset-upload-input");
            const dropzone = assetManagerContainer.querySelector("#vsb-asset-dropzone");
            const list = assetManagerContainer.querySelector("#vsb-asset-list");
            
            const handleFiles = (files) => {
                let changed = false;
                for (let file of files) {
                    const isImg = file.type.startsWith("image/");
                    const isAud = file.type.startsWith("audio/");
                    if (!isImg && !isAud) continue;
                    
                    const assetId = "a_" + Date.now() + "_" + Math.floor(Math.random()*1000);
                    const url = URL.createObjectURL(file);
                    
                    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                    const cleanName = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    const typeLabel = isImg ? "Image" : "Audio";
                    const formattedName = cleanName + " " + typeLabel;
                    
                    this.ctx.registerAsset(assetId, {
                        url,
                        filename: formattedName,
                        file,
                        type: isImg ? "image" : "audio"
                    });
                    changed = true;
                }
                if (changed) {
                    this.vsgraph.render();
                    this.renderPreviewContent();
                }
            };

            dropzone.addEventListener("click", () => fileInput.click());
            fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
            
            dropzone.addEventListener("dragover", (e) => {
                e.preventDefault();
                dropzone.style.background = "rgba(255,255,255,0.1)";
            });
            dropzone.addEventListener("dragleave", (e) => {
                e.preventDefault();
                dropzone.style.background = "rgba(255,255,255,0.05)";
            });
            dropzone.addEventListener("drop", (e) => {
                e.preventDefault();
                dropzone.style.background = "rgba(255,255,255,0.05)";
                if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
            });

            if (this.ctx.assets.size === 0) {
                list.innerHTML = "<div style='color: #8b93a7; font-size: 11px; font-style: italic;'>No assets uploaded yet.</div>";
            } else {
                for (const [id, asset] of this.ctx.assets.entries()) {
                    const item = document.createElement("div");
                    Object.assign(item.style, {
                        background: "#2a2a2e", padding: "10px", borderRadius: "4px",
                        display: "flex", alignItems: "center", gap: "12px",
                        border: "1px solid #3a3b40"
                    });
                    
                    if (asset.type === "image") {
                        item.innerHTML = `<img src="${asset.url}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; background: #000;" />
                                          <div style="display: flex; flex-direction: column; overflow: hidden;">
                                              <span style="font-size: 13px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${asset.filename}</span>
                                              <span style="font-size: 10px; color: #8b93a7;">Image</span>
                                          </div>`;
                    } else {
                        item.innerHTML = `<div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #18191c; border-radius: 4px; font-size: 24px;">🎵</div>
                                          <div style="display: flex; flex-direction: column; overflow: hidden;">
                                              <span style="font-size: 13px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${asset.filename}</span>
                                              <span style="font-size: 10px; color: #8b93a7;">Audio</span>
                                          </div>`;
                    }
                    list.append(item);
                }
            }
        } else {
            const filesObj = this.compiledData[`${this.previewActiveTab}Files`];
            const fileNames = Object.keys(filesObj);
            let val = "";
            if (fileNames.length === 0) {
                val = `No ${this.previewActiveTab.toUpperCase()} files generated.`;
            } else {
                for (const fn of fileNames) {
                    val += `/* --- ${fn} --- */\n\n${filesObj[fn]}\n\n`;
                }
            }
            this.previewContent.append(createTextArea(val));
        }
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
            else if (key === "7") { this.addDefault = "ADD_ASSET_IMAGE"; this.setMode(this.addDefault); }
            else if (key === "8") { this.addDefault = "ADD_ASSET_AUDIO"; this.setMode(this.addDefault); }
            
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
            this.ctx.showEdgeErrors = !this.ctx.showEdgeErrors;
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
        selText.innerHTML = `Selected File: ${selName}`;
        headerRow.append(selText);

        const breadcrumbSep = document.createElement("div");
        breadcrumbSep.textContent = "|";
        breadcrumbSep.style.color = "#666";
        
        const modeText = document.createElement("div");
        modeText.style.color = "#fff";
        modeText.style.fontWeight = "bold";
        
        if (this.activeSubMenu === "ADD") modeText.textContent = `Mode: Add > ...`;
        else if (this.activeSubMenu === "EDGE") modeText.textContent = `Mode: Edge > ...`;
        else if (this.ctx.mode.startsWith("ADD_")) modeText.textContent = `Mode: Add > ${this.ctx.mode.substring(4)}`;
        else if (this.ctx.mode.startsWith("EDGE_")) modeText.textContent = `Mode: Edge > ${this.ctx.mode.substring(5)}`;
        else if (this.ctx.mode === "DELETE") modeText.textContent = `Mode: Delete`;
        else if (this.ctx.mode === "CURSOR") modeText.textContent = `Mode: Cursor`;
        else modeText.textContent = `Mode: ${this.ctx.mode}`;
        
        headerRow.append(breadcrumbSep, modeText);

        this.container.append(headerRow);

        const toolbarRow = document.createElement("div");
        Object.assign(toolbarRow.style, {
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            pointerEvents: "none",
            position: "relative"
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
            btn.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                onClick(e);
            });
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
                case "ADD_ASSET_IMAGE": return "Image Asset";
                case "ADD_ASSET_AUDIO": return "Audio Asset";
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
            createIconBtn(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`, "7", this.ctx.showEdgeErrors, () => {
                this.ctx.showEdgeErrors = !this.ctx.showEdgeErrors;
                this.render();
                this.vsgraph.render();
            })
        );

        const handleEdgeToggle = (type, e) => {
            const allTypes = ["showElementEdges", "showIncludeEdges", "showCssEdges", "showJsEdges", "showAssetEdges", "showScriptEventEdges", "showInlineStyleEdges"];
            if (e.shiftKey) {
                allTypes.forEach(t => this.ctx[t] = false);
                this.ctx[type] = true;
            } else if (e.ctrlKey || e.metaKey) {
                allTypes.forEach(t => this.ctx[t] = true);
                this.ctx[type] = false;
            } else {
                this.ctx[type] = !this.ctx[type];
            }
            this.render();
            this.vsgraph.render();
        };

        const mkEdgeToggleBtn = (label, active, type, color) => {
            const btn = document.createElement("div");
            Object.assign(btn.style, {
                boxSizing: "border-box", padding: "0 10px", height: "32px",
                borderRadius: "6px", cursor: "pointer",
                background: active ? "#ffffff" : "#1a1a1a",
                color: active ? "#000000" : "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "8px",
                fontSize: "11px", fontWeight: "bold", pointerEvents: "auto",
                border: active ? "2px solid #ffffff" : "2px solid #333",
                whiteSpace: "nowrap", width: "100%"
            });
            
            const dot = document.createElement("div");
            Object.assign(dot.style, {
                width: "8px", height: "8px", borderRadius: "50%", background: color, border: active ? "1px solid rgba(0,0,0,0.5)" : "none"
            });
            
            const text = document.createElement("div");
            text.textContent = label;
            
            btn.append(dot, text);
            
            btn.addEventListener("pointerenter", () => { if (!active) btn.style.background = "#2a2a2a"; });
            btn.addEventListener("pointerleave", () => { if (!active) btn.style.background = "#1a1a1a"; });
            btn.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                handleEdgeToggle(type, e);
            });
            return btn;
        };

        mainCol.append(
            separator.cloneNode(),
            mkEdgeToggleBtn("HTML Includes", this.ctx.showIncludeEdges, "showIncludeEdges", "rgba(255,255,255,0.7)"),
            mkEdgeToggleBtn("Element Structure", this.ctx.showElementEdges, "showElementEdges", "#e34c26"),
            mkEdgeToggleBtn("CSS Rules", this.ctx.showCssEdges, "showCssEdges", "#264de4"),
            mkEdgeToggleBtn("Inline Styles", this.ctx.showInlineStyleEdges, "showInlineStyleEdges", "#3b82f6"),
            mkEdgeToggleBtn("JS Flow", this.ctx.showJsEdges, "showJsEdges", "#f7df1e"),
            mkEdgeToggleBtn("JS Events", this.ctx.showScriptEventEdges, "showScriptEventEdges", "#f7df1e"),
            mkEdgeToggleBtn("Assets", this.ctx.showAssetEdges, "showAssetEdges", "#ec4899")
        );

        if (this.activeSubMenu) {
            const subRow = document.createElement("div");
            Object.assign(subRow.style, {
                position: "absolute",
                left: "52px",
                display: "flex",
                gap: "8px",
                pointerEvents: "auto",
                top: this.activeSubMenu === "ADD" ? "50px" : "100px",
                height: "42px",
                alignItems: "center"
            });
            
            const createSubBtn = (label, hotkey, active, onClick) => {
                const btn = document.createElement("div");
                Object.assign(btn.style, {
                    boxSizing: "border-box",
                    height: "42px",
                    padding: "0 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: active ? "#ffffff" : "#0a0a0a",
                    color: active ? "#000000" : "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    fontWeight: "bold",
                    transition: "background 0.1s, color 0.1s",
                    border: active ? "2px solid #ffffff" : "2px solid #333",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                    backdropFilter: "blur(8px)",
                    whiteSpace: "nowrap"
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
                    createSubBtn("JS Event", "6", this.ctx.mode === "ADD_JS_EVENT", () => { this.addDefault = "ADD_JS_EVENT"; this.setMode("ADD_JS_EVENT"); this.activeSubMenu = null; }),
                    createSubBtn("Image Asset", "7", this.ctx.mode === "ADD_ASSET_IMAGE", () => { this.addDefault = "ADD_ASSET_IMAGE"; this.setMode("ADD_ASSET_IMAGE"); this.activeSubMenu = null; }),
                    createSubBtn("Audio Asset", "8", this.ctx.mode === "ADD_ASSET_AUDIO", () => { this.addDefault = "ADD_ASSET_AUDIO"; this.setMode("ADD_ASSET_AUDIO"); this.activeSubMenu = null; })
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

        this.previewPanel.style.display = "flex";
        if (!this.compiledData) {
            this.triggerCompile();
        }
    }
}
