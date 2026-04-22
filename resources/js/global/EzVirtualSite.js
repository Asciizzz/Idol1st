/*
EzVirtualSite
By Asciiz

Project-independent virtual multi-page site runtime.

What this thing is:
    + A framework/library for converting project JSON into iframe-backed virtual pages
    + One iframe per page, with id="ez-virtualpage-{pageId}"
    + Runtime/data engine only, no editor UI and no event system by default

Core values:
    + #pages: collection of iframe elements, keyed by iframe id
    + #activePage: current active page id, or null when nothing is active
    + #dataJSON: project JSON that stores pages, nodes, stylesheets, and scripts
    + #autosave: when true, mutations re-render the affected iframe automatically
    + #host: element that receives the generated iframe set

API:
    + init(cfg)
        + cfg.host: required mount element
        + cfg.dataJSON: project data object, optional
        + cfg.autosave: boolean, optional
        + validates incoming JSON, builds iframes, activates the start page, returns this

    + static makeObjectFromJSON(jsonpath)
        + fetches a JSON file and returns the parsed object

    + getActivePageId()
        + returns the current active page id

    + getDataJSON()
        + returns a deep-cloned copy of the project data

    + getPage(pageId)
        + returns the raw page object for the given id, or null

    + listPages()
        + returns a light list of pages: { id, title, slug }

    + load(pageId)
        + renders page data into the matching iframe and returns boolean success

    + setActivePage(pageId)
        + hides the previous page iframe, shows the target iframe, returns boolean success

    + addPage(cfg)
        + creates a new page and returns the new page id, or null/false on failure

    + removePage(pageId)
        + deletes a page and returns boolean success

    + updatePage(pageId, updates)
        + updates page title/slug and re-renders the page when needed

    + addNode(nodeData)
        + creates a node under the active page and returns the new node id, or null

    + deleteNode(nodeId, pageId)
        + removes a node subtree from the target page and returns boolean success

    + reparentNode(childId, newParentId)
        + moves a node under a new parent after relation checks, returns boolean success

    + getHierarchy(nodeId, format = "object")
        + returns nested hierarchy data for the active page as object or string

    + syncPages()
        + rebuilds iframe collection from current data and re-selects the active page

Node rules:
    + node ids use the format n<number>
    + page ids use the format p<number>
    + a node can have children or text, but if both exist the children win and text is ignored
    + _prefixed attrs are editor/runtime attributes and are not passed straight through as DOM attrs
    + _href_id is resolved into a real href using the target page slug

Page/data shape:
    + pages.page_data holds page objects keyed by page id
    + each page stores title, slug, node_root/node_start, node_counter, nodes, and include lists
    + page include lists support css/js asset names from project stylesheets/scripts maps
    + stylesheets assets can be raw CSS string (legacy) or selector-mapped objects

This file intentionally keeps the logic low-level so the editor can stay separate.
*/

(function() {
    class EzVirtualSite {
        #pages = {};
        #activePage = null;
        #dataJSON = null;
        #autosave = false;
        #host = null;
        #onNavigate = null;
        #globalStyleText = "";
        #docInteractionState = new Map();

        static cloneData(value) {
            if (typeof structuredClone === "function") {
                return structuredClone(value);
            }

            if (value == null) return value;
            return JSON.parse(JSON.stringify(value));
        }

        static async makeObjectFromJSON(jsonpath) {
            if (typeof jsonpath !== "string" || !jsonpath.trim()) {
                throw new Error("jsonpath must be a non-empty string.");
            }

            const response = await fetch(jsonpath);
            if (!response.ok) {
                throw new Error(`Failed to fetch JSON (${response.status}).`);
            }

            return response.json();
        }

        init(cfg = {}) {
            if (!cfg || typeof cfg !== "object") {
                throw new Error("init(cfg) expects an object config.");
            }

            const host = cfg.host;
            if (!(host instanceof Element)) {
                throw new Error("cfg.host must be a valid DOM element.");
            }

            const inputData = cfg.dataJSON && typeof cfg.dataJSON === "object"
                ? EzVirtualSite.cloneData(cfg.dataJSON)
                : this.#createEmptyProjectData();

            this.#host = host;
            this.#dataJSON = inputData;
            this.#autosave = cfg.autosave === true;
            this.#onNavigate = typeof cfg.onNavigate === "function" ? cfg.onNavigate : null;

            this.#validateDataJSON(this.#dataJSON);
            this.#buildPageFrames();

            const startPage = this.#dataJSON.pages.page_start || this.#firstPageId();
            if (startPage) {
                this.setActivePage(startPage);
            }

            return this;
        }

        setAutosave(value) {
            this.#autosave = Boolean(value);
            return this.#autosave;
        }

        setGlobalStyle(styleElement) {
            if (styleElement == null) {
                this.#globalStyleText = "";
                this.#removeGlobalStyleFromFrames();
                return true;
            }

            const tagName = styleElement?.tagName ? styleElement.tagName.toLowerCase() : "";
            if (tagName !== "style") {
                return false;
            }

            this.#globalStyleText = String(styleElement.textContent || "");
            this.#applyGlobalStyleToAllFrames();
            return true;
        }

        getActivePageId() {
            return this.#activePage;
        }

        getDataJSON() {
            return EzVirtualSite.cloneData(this.#dataJSON);
        }

        getPage(pageId) {
            if (typeof pageId !== "string" || !pageId.trim()) return null;
            return this.#dataJSON?.pages?.page_data?.[pageId] || null;
        }

        listPages() {
            const pageData = this.#dataJSON?.pages?.page_data || {};
            return Object.entries(pageData).map(([pageId, page]) => {
                return {
                    id: pageId,
                    title: page?.title || "(untitled)",
                    slug: page?.slug || "",
                };
            });
        }

        load(pageId) {
            const page = this.getPage(pageId);
            if (!page) return false;

            const iframe = this.#getFrameForPage(pageId);
            if (!iframe) return false;

            const frameDoc = iframe.contentDocument;
            if (!frameDoc) return false;

            this.#ensureFrameShell(frameDoc);
            this.#bindFrameInteractions(frameDoc, pageId);
            this.#applyGlobalStyleToFrame(frameDoc);

            frameDoc.title = page.title || "";

            const rootNodeId = this.#rootNodeId(page);
            const nodes = page.nodes || {};
            const rootNode = nodes[rootNodeId];
            if (!rootNode) return false;

            this.#applyNodeToDocument(frameDoc, nodes, rootNodeId);
            this.#injectPageAssets(frameDoc, page);

            return true;
        }

        setActivePage(pageId) {
            if (!this.getPage(pageId)) return false;

            const nextFrame = this.#getFrameForPage(pageId);
            if (!nextFrame) return false;

            this.load(pageId);

            if (this.#activePage) {
                const activeFrame = this.#getFrameForPage(this.#activePage);
                if (activeFrame) {
                    activeFrame.style.display = "none";
                    activeFrame.classList.remove("is-active");
                }
            }

            nextFrame.style.display = "block";
            nextFrame.classList.add("is-active");
            this.#activePage = pageId;
            this.#dataJSON.pages.page_start = pageId;

            return true;
        }

        addPage(cfg = {}) {
            const pageData = this.#dataJSON.pages.page_data;
            let nextCounter = Number(this.#dataJSON.pages.page_counter) || 0;
            let pageId = `p${nextCounter}`;

            while (pageData[pageId]) {
                nextCounter += 1;
                pageId = `p${nextCounter}`;
            }

            const title = String(cfg.title || "New Page").trim() || "New Page";
            const slug = this.#slugify(cfg.slug || title);

            pageData[pageId] = {
                title,
                slug,
                node_root: "n0",
                node_start: "n0",
                node_counter: 1,
                nodes: {
                    n0: {
                        tag: "body",
                        parent: null,
                        children: [],
                    },
                },
                include: {
                    css: [],
                    js: [],
                },
            };

            this.#dataJSON.pages.page_counter = nextCounter + 1;
            if (!this.#dataJSON.pages.page_start) {
                this.#dataJSON.pages.page_start = pageId;
            }

            this.syncPages();
            this.setActivePage(pageId);
            return pageId;
        }

        removePage(pageId) {
            const pageData = this.#dataJSON.pages.page_data;
            if (!pageData[pageId]) return false;

            const pageIds = Object.keys(pageData);
            if (pageIds.length <= 1) return false;

            delete pageData[pageId];

            if (this.#dataJSON.pages.page_start === pageId) {
                this.#dataJSON.pages.page_start = Object.keys(pageData)[0] || null;
            }

            if (this.#activePage === pageId) {
                this.#activePage = this.#dataJSON.pages.page_start;
            }

            this.syncPages();

            if (this.#activePage) {
                this.setActivePage(this.#activePage);
            }

            return true;
        }

        updatePage(pageId, updates = {}) {
            const page = this.getPage(pageId);
            if (!page) return false;

            if (Object.prototype.hasOwnProperty.call(updates, "title")) {
                const nextTitle = String(updates.title || "").trim();
                if (!nextTitle) return false;
                page.title = nextTitle;
            }

            if (Object.prototype.hasOwnProperty.call(updates, "slug")) {
                const nextSlug = this.#slugify(updates.slug || page.title || "new-page");
                page.slug = nextSlug;
            }

            if (this.#autosave || this.#activePage === pageId) {
                this.load(pageId);
            }

            return true;
        }

        addNode(nodeData = {}) {
            const page = this.getPage(this.#activePage);
            if (!page) return null;

            const nodes = page.nodes || {};
            const rootId = this.#rootNodeId(page);

            const parentId = typeof nodeData.parent === "string" && nodeData.parent.trim()
                ? nodeData.parent.trim()
                : rootId;

            if (!nodes[parentId]) return null;

            const nodeId = this.#createNode(page, parentId, nodeData);
            if (!nodeId) return null;

            if (this.#autosave) {
                this.load(this.#activePage);
            }

            return nodeId;
        }

        addTemplateNode(template, parentId) {
            const page = this.getPage(this.#activePage);
            if (!page) return null;

            const nodes = page.nodes || {};
            const targetParentId = typeof parentId === "string" && parentId.trim()
                ? parentId.trim()
                : this.#rootNodeId(page);

            if (!nodes[targetParentId]) return null;

            const rootTemplateNode = template && typeof template === "object" && template.content
                ? template.content
                : template;

            const createdNodeId = this.#createNodeTreeFromTemplate(page, targetParentId, rootTemplateNode);
            if (!createdNodeId) return null;

            if (this.#autosave) {
                this.load(this.#activePage);
            }

            return createdNodeId;
        }

        deleteNode(nodeId, pageId = this.#activePage) {
            const page = this.getPage(pageId);
            if (!page || typeof nodeId !== "string") return false;

            const nodes = page.nodes || {};
            const target = nodes[nodeId];
            if (!target) return false;

            const rootId = this.#rootNodeId(page);
            if (nodeId === rootId || target.parent === null) return false;

            const parentNode = nodes[target.parent];
            if (parentNode && Array.isArray(parentNode.children)) {
                parentNode.children = parentNode.children.filter((childId) => childId !== nodeId);
            }

            this.#deleteNodeSubtree(nodes, nodeId);

            if (this.#autosave || pageId === this.#activePage) {
                this.load(pageId);
            }

            return true;
        }

        reparentNode(childId, newParentId) {
            const page = this.getPage(this.#activePage);
            if (!page) return false;

            const nodes = page.nodes || {};
            const childNode = nodes[childId];
            const newParentNode = nodes[newParentId];
            if (!childNode || !newParentNode) return false;

            const rootId = this.#rootNodeId(page);
            if (childId === rootId || childId === newParentId) return false;

            let cursor = newParentId;
            while (cursor) {
                if (cursor === childId) return false;
                cursor = nodes[cursor]?.parent || null;
            }

            if (childNode.parent && nodes[childNode.parent] && Array.isArray(nodes[childNode.parent].children)) {
                nodes[childNode.parent].children = nodes[childNode.parent].children.filter((id) => id !== childId);
            }

            if (!Array.isArray(newParentNode.children)) {
                newParentNode.children = [];
            }
            if (!newParentNode.children.includes(childId)) {
                newParentNode.children.push(childId);
            }

            childNode.parent = newParentId;

            if (this.#autosave) {
                this.load(this.#activePage);
            }

            return true;
        }

        getHierarchy(nodeId, format = "object") {
            const page = this.getPage(this.#activePage);
            if (!page) return null;

            const nodes = page.nodes || {};
            const rootId = this.#rootNodeId(page);
            const startNodeId = typeof nodeId === "string" && nodeId.trim() ? nodeId.trim() : rootId;

            if (!nodes[startNodeId]) return null;

            const hierarchy = this.#buildHierarchy(nodes, startNodeId);
            if (format === "string") {
                return this.#hierarchyToString(hierarchy);
            }

            return hierarchy;
        }

        syncPages() {
            const previousActive = this.#activePage;
            this.#buildPageFrames();

            const preferred = this.getPage(previousActive) ? previousActive : this.#dataJSON.pages.page_start;
            if (preferred) {
                this.setActivePage(preferred);
            }

            return true;
        }

        #createEmptyProjectData() {
            return {
                project: {},
                pages: {
                    page_start: "p0",
                    page_counter: 1,
                    page_data: {
                        p0: {
                            title: "New Page",
                            slug: "new-page",
                            node_root: "n0",
                            node_start: "n0",
                            node_counter: 1,
                            nodes: {
                                n0: {
                                    tag: "body",
                                    parent: null,
                                    children: [],
                                },
                            },
                            include: {
                                css: [],
                                js: [],
                            },
                        },
                    },
                },
                stylesheets: {},
                scripts: {},
            };
        }

        #validateDataJSON(data) {
            if (!data || typeof data !== "object") {
                throw new Error("dataJSON must be a valid object.");
            }

            if (!data.pages || typeof data.pages !== "object") {
                throw new Error("dataJSON.pages must be an object.");
            }

            if (!data.pages.page_data || typeof data.pages.page_data !== "object") {
                throw new Error("dataJSON.pages.page_data must be an object.");
            }

            if (!Number.isInteger(data.pages.page_counter) || data.pages.page_counter < 0) {
                throw new Error("dataJSON.pages.page_counter must be a non-negative integer.");
            }

            if (!data.stylesheets || typeof data.stylesheets !== "object") {
                data.stylesheets = {};
            }

            if (!data.scripts || typeof data.scripts !== "object") {
                data.scripts = {};
            }

            const pageIds = Object.keys(data.pages.page_data);
            if (pageIds.length === 0) {
                throw new Error("dataJSON.pages.page_data must contain at least one page.");
            }

            let maxPageIndex = -1;
            for (const pageId of pageIds) {
                if (!/^p\d+$/.test(pageId)) {
                    throw new Error(`Invalid page id '${pageId}'. Expected format p<number>.`);
                }

                maxPageIndex = Math.max(maxPageIndex, Number(pageId.slice(1)));

                const page = data.pages.page_data[pageId];
                if (!page || typeof page !== "object") {
                    throw new Error(`Page '${pageId}' must be an object.`);
                }

                if (!page.nodes || typeof page.nodes !== "object") {
                    throw new Error(`Page '${pageId}' must include nodes object.`);
                }

                if (!Number.isInteger(page.node_counter) || page.node_counter < 0) {
                    throw new Error(`Page '${pageId}' node_counter must be a non-negative integer.`);
                }

                if (!page.node_root && page.node_start) {
                    page.node_root = page.node_start;
                }
                if (!page.node_start && page.node_root) {
                    page.node_start = page.node_root;
                }

                const rootId = this.#rootNodeId(page);
                if (!rootId || !page.nodes[rootId]) {
                    throw new Error(`Page '${pageId}' root node is missing.`);
                }

                let maxNodeIndex = -1;
                for (const [nodeId, node] of Object.entries(page.nodes)) {
                    if (!/^n\d+$/.test(nodeId)) {
                        throw new Error(`Invalid node id '${nodeId}' in page '${pageId}'. Expected n<number>.`);
                    }

                    maxNodeIndex = Math.max(maxNodeIndex, Number(nodeId.slice(1)));

                    if (!node || typeof node !== "object") {
                        throw new Error(`Node '${nodeId}' in page '${pageId}' must be an object.`);
                    }

                    if (typeof node.tag !== "string" || !node.tag.trim()) {
                        throw new Error(`Node '${nodeId}' in page '${pageId}' must have a valid tag.`);
                    }

                    if (node.parent !== null && (typeof node.parent !== "string" || !page.nodes[node.parent])) {
                        throw new Error(`Node '${nodeId}' in page '${pageId}' has invalid parent.`);
                    }

                    if (node.children != null) {
                        if (!Array.isArray(node.children)) {
                            throw new Error(`Node '${nodeId}' in page '${pageId}' children must be an array.`);
                        }

                        for (const childId of node.children) {
                            if (typeof childId !== "string" || !page.nodes[childId]) {
                                throw new Error(`Node '${nodeId}' in page '${pageId}' references invalid child '${childId}'.`);
                            }
                        }
                    }
                }

                // Accept legacy JSON with stale counters and normalize forward.
                if (page.node_counter <= maxNodeIndex) {
                    page.node_counter = maxNodeIndex + 1;
                }
            }

            // Accept legacy JSON with stale counters and normalize forward.
            if (data.pages.page_counter <= maxPageIndex) {
                data.pages.page_counter = maxPageIndex + 1;
            }

            if (data.pages.page_start && !data.pages.page_data[data.pages.page_start]) {
                throw new Error("dataJSON.pages.page_start references a missing page.");
            }
        }

        #firstPageId() {
            const ids = Object.keys(this.#dataJSON?.pages?.page_data || {});
            return ids.length ? ids[0] : null;
        }

        #rootNodeId(page) {
            return page?.node_root || page?.node_start || null;
        }

        #slugify(input) {
            return String(input || "new-page")
                .toLowerCase()
                .trim()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9\/_-]/g, "")
                .replace(/-+/g, "-")
                .replace(/^[-/]+|[-/]+$/g, "") || "new-page";
        }

        #buildPageFrames() {
            if (!this.#host) return;

            this.#pages = {};
            this.#host.replaceChildren();

            const pageData = this.#dataJSON.pages.page_data;
            for (const pageId of Object.keys(pageData)) {
                const iframe = document.createElement("iframe");
                iframe.id = `ez-virtualpage-${pageId}`;
                iframe.className = "ez-virtualpage";
                iframe.title = pageData[pageId]?.title || `Virtual page ${pageId}`;
                iframe.style.width = "100%";
                iframe.style.height = "100%";
                iframe.style.border = "0";
                iframe.style.display = "none";

                this.#host.appendChild(iframe);
                this.#pages[iframe.id] = iframe;
            }
        }

        #ensureFrameShell(frameDoc) {
            if (!frameDoc.documentElement) {
                frameDoc.appendChild(frameDoc.createElement("html"));
            }

            if (!frameDoc.head) {
                frameDoc.documentElement.insertBefore(frameDoc.createElement("head"), frameDoc.documentElement.firstChild);
            }

            if (!frameDoc.body) {
                frameDoc.documentElement.appendChild(frameDoc.createElement("body"));
            }

            if (!frameDoc.head.querySelector('meta[charset]')) {
                const charsetMeta = frameDoc.createElement("meta");
                charsetMeta.setAttribute("charset", "utf-8");
                frameDoc.head.prepend(charsetMeta);
            }

            frameDoc.body.replaceChildren();
        }

        #globalStyleNodeId() {
            return "ez-virtualsite-global-style";
        }

        #applyGlobalStyleToAllFrames() {
            for (const iframe of Object.values(this.#pages)) {
                const frameDoc = iframe?.contentDocument;
                if (!frameDoc) continue;
                this.#applyGlobalStyleToFrame(frameDoc);
            }
        }

        #removeGlobalStyleFromFrames() {
            for (const iframe of Object.values(this.#pages)) {
                const frameDoc = iframe?.contentDocument;
                if (!frameDoc) continue;

                const existing = frameDoc.getElementById(this.#globalStyleNodeId());
                if (existing) existing.remove();
            }
        }

        #applyGlobalStyleToFrame(frameDoc) {
            if (!frameDoc?.head) return;

            const existing = frameDoc.getElementById(this.#globalStyleNodeId());
            if (!this.#globalStyleText) {
                if (existing) existing.remove();
                return;
            }

            const styleNode = existing || frameDoc.createElement("style");
            styleNode.id = this.#globalStyleNodeId();
            styleNode.textContent = this.#globalStyleText;

            if (!existing) {
                frameDoc.head.appendChild(styleNode);
            }
        }

        #bindFrameInteractions(frameDoc, pageId) {
            if (!frameDoc || frameDoc.__ezVirtualSiteInteractionsBound) return;

            frameDoc.__ezVirtualSiteInteractionsBound = true;
            this.#docInteractionState.set(frameDoc, {
                pageId,
                hoverNode: null,
                selectedNode: null,
                dragoverNode: null,
            });

            const closestNode = (target) => {
                if (!target) return null;
                const elementTarget = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
                if (!elementTarget || !elementTarget.closest) return null;
                return elementTarget.closest("[data-vs-node-id]");
            };

            const setHover = (node) => {
                const state = this.#docInteractionState.get(frameDoc);
                if (!state) return;
                if (state.hoverNode === node) return;

                if (state.hoverNode) state.hoverNode.classList.remove("ez-virtualsite-hover");
                state.hoverNode = node;
                if (state.hoverNode) state.hoverNode.classList.add("ez-virtualsite-hover");
            };

            const setSelected = (node) => {
                const state = this.#docInteractionState.get(frameDoc);
                if (!state) return;
                if (state.selectedNode === node) return;

                if (state.selectedNode) state.selectedNode.classList.remove("ez-virtualsite-selected");
                state.selectedNode = node;
                if (state.selectedNode) state.selectedNode.classList.add("ez-virtualsite-selected");
            };

            const setDragover = (node) => {
                const state = this.#docInteractionState.get(frameDoc);
                if (!state) return;
                if (state.dragoverNode === node) return;

                if (state.dragoverNode) state.dragoverNode.classList.remove("ez-virtualsite-dragover");
                state.dragoverNode = node;
                if (state.dragoverNode) state.dragoverNode.classList.add("ez-virtualsite-dragover");
            };

            frameDoc.addEventListener("mousemove", (event) => {
                setHover(closestNode(event.target));
            }, true);

            frameDoc.addEventListener("mouseleave", () => {
                setHover(null);
                setDragover(null);
            }, true);

            frameDoc.addEventListener("click", (event) => {
                const node = closestNode(event.target);
                if (node) setSelected(node);

                const elementTarget = event.target?.nodeType === Node.ELEMENT_NODE ? event.target : event.target?.parentElement;
                const anchor = elementTarget?.closest?.("a[data-href-id], a[data_href_id]") || null;
                if (!anchor) return;

                const targetPageId = anchor.getAttribute("data-href-id") || anchor.getAttribute("data_href_id") || "";
                if (!targetPageId || !this.getPage(targetPageId)) return;

                event.preventDefault();
                const fromPageId = this.#activePage;
                if (!this.setActivePage(targetPageId)) return;

                if (typeof this.#onNavigate === "function") {
                    this.#onNavigate({ fromPageId, toPageId: targetPageId, source: "_href_id" });
                }
            }, true);

            frameDoc.addEventListener("dragstart", (event) => {
                const node = closestNode(event.target);
                if (!node) return;

                const nodeId = node.getAttribute("data-vs-node-id") || "";
                if (!nodeId) return;

                event.dataTransfer?.setData("application/x-ezvs-node", JSON.stringify({ nodeId, pageId }));
                event.dataTransfer?.setData("text/plain", nodeId);
                if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = "move";
                }
            }, true);

            frameDoc.addEventListener("dragover", (event) => {
                const node = closestNode(event.target);
                if (!node) {
                    setDragover(null);
                    return;
                }

                event.preventDefault();
                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = "copy";
                }
                setDragover(node);
            }, true);

            frameDoc.addEventListener("drop", (event) => {
                const node = closestNode(event.target);
                if (!node) {
                    setDragover(null);
                    return;
                }

                event.preventDefault();

                const parentId = node.getAttribute("data-vs-node-id") || "";
                let changed = false;

                const templateData = event.dataTransfer?.getData("application/x-ezvs-template") || "";
                if (templateData) {
                    try {
                        const parsedTemplate = JSON.parse(templateData);
                        changed = Boolean(this.addTemplateNode(parsedTemplate, parentId));
                    } catch (error) {
                        changed = false;
                    }
                }

                if (!changed) {
                    const nodeData = event.dataTransfer?.getData("application/x-ezvs-node") || "";
                    if (nodeData) {
                        try {
                            const parsedNode = JSON.parse(nodeData);
                            const draggingNodeId = parsedNode?.nodeId;
                            if (typeof draggingNodeId === "string" && draggingNodeId) {
                                changed = this.reparentNode(draggingNodeId, parentId);
                            }
                        } catch (error) {
                            changed = false;
                        }
                    }
                }

                if (changed && this.#autosave) {
                    this.load(this.#activePage);
                }

                setDragover(null);
            }, true);
        }

        #frameIdForPage(pageId) {
            return `ez-virtualpage-${pageId}`;
        }

        #getFrameForPage(pageId) {
            return this.#pages[this.#frameIdForPage(pageId)] || null;
        }

        #injectPageAssets(frameDoc, page) {
            for (const assetNode of frameDoc.querySelectorAll("[data-asset]")) {
                assetNode.remove();
            }

            const includes = page.include || {};
            const cssAssets = Array.isArray(includes.css) ? includes.css : [];
            const jsAssets = Array.isArray(includes.js) ? includes.js : [];

            for (const cssName of cssAssets) {
                const cssAsset = this.#dataJSON.stylesheets[cssName];
                const cssText = this.#stylesheetAssetToText(cssAsset);
                if (!cssText) continue;

                const styleEl = frameDoc.createElement("style");
                styleEl.setAttribute("data-asset", cssName);
                styleEl.textContent = cssText;
                frameDoc.head.appendChild(styleEl);
            }

            for (const jsName of jsAssets) {
                const jsText = this.#dataJSON.scripts[jsName];
                if (typeof jsText !== "string") continue;

                const scriptEl = frameDoc.createElement("script");
                scriptEl.setAttribute("data-asset", jsName);
                scriptEl.textContent = jsText;
                frameDoc.body.appendChild(scriptEl);
            }
        }

        #stylesheetAssetToText(asset) {
            if (typeof asset === "string") {
                return asset;
            }

            if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
                return "";
            }

            return this.#compileStyleRuleMap(asset);
        }

        #compileStyleRuleMap(ruleMap) {
            const chunks = [];

            for (const [selector, body] of Object.entries(ruleMap)) {
                if (typeof selector !== "string" || !selector.trim()) continue;
                const selectorText = selector.trim();

                if (selectorText.startsWith("@")) {
                    const nested = this.#compileStyleRuleMap(body && typeof body === "object" ? body : {});
                    if (!nested.trim()) continue;
                    chunks.push(`${selectorText} {\n${nested}\n}`);
                    continue;
                }

                const declarations = this.#compileCSSDeclarations(body);
                if (!declarations) continue;
                chunks.push(`${selectorText} {\n${declarations}\n}`);
            }

            return chunks.join("\n\n");
        }

        #compileCSSDeclarations(declarationMap) {
            if (!declarationMap || typeof declarationMap !== "object" || Array.isArray(declarationMap)) {
                return "";
            }

            const lines = [];
            for (const [propName, propValue] of Object.entries(declarationMap)) {
                if (propValue == null) continue;
                const valueType = typeof propValue;
                if (valueType !== "string" && valueType !== "number" && valueType !== "boolean") continue;

                const cssProp = this.#toKebabCaseProperty(propName);
                if (!cssProp) continue;
                lines.push(`    ${cssProp}: ${String(propValue)};`);
            }

            return lines.join("\n");
        }

        #toKebabCaseProperty(propName) {
            if (typeof propName !== "string") return "";

            const trimmed = propName.trim();
            if (!trimmed) return "";

            return trimmed
                .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
                .replace(/_/g, "-")
                .toLowerCase();
        }

        #applyNodeToDocument(frameDoc, nodes, nodeId) {
            const rootNode = nodes[nodeId];
            if (!rootNode) return;

            const renderedRoot = this.#buildDomNode(frameDoc, nodes, nodeId);
            if (renderedRoot && renderedRoot !== frameDoc.body && frameDoc.body.childNodes.length === 0) {
                frameDoc.body.appendChild(renderedRoot);
            }
        }

        #buildDomNode(frameDoc, nodes, nodeId) {
            const node = nodes[nodeId];
            if (!node) return null;

            const isBodyRoot = node.tag === "body" && node.parent === null;
            const element = isBodyRoot ? frameDoc.body : frameDoc.createElement(node.tag || "div");

            this.#applyNodeAttributes(element, node.attrs || {});
            element.setAttribute("data-vs-node-id", nodeId);
            element.setAttribute("data-wc-node-id", nodeId);
            element.setAttribute("draggable", "true");

            const children = Array.isArray(node.children) ? node.children : [];
            for (const childId of children) {
                const childEl = this.#buildDomNode(frameDoc, nodes, childId);
                if (childEl && childEl !== frameDoc.body) {
                    element.appendChild(childEl);
                }
            }

            if (children.length === 0 && typeof node.text === "string") {
                element.textContent = node.text;
            }

            return element;
        }

        #applyNodeAttributes(element, attrs) {
            for (const [name, value] of Object.entries(attrs)) {
                if (name === "_href_id") {
                    const targetPageId = typeof value === "string" ? value.trim() : "";
                    if (targetPageId) {
                        element.setAttribute("data-href-id", targetPageId);
                        element.setAttribute("data_href_id", targetPageId);

                        const resolved = this.#resolveHrefId(targetPageId);
                        if (resolved && element.tagName.toLowerCase() === "a") {
                            element.setAttribute("href", resolved);
                        }
                    }
                    continue;
                }

                if (name.startsWith("_")) continue;
                element.setAttribute(name, value);
            }
        }

        #resolveHrefId(pageId) {
            if (typeof pageId !== "string" || !pageId.trim()) return "";
            const page = this.#dataJSON.pages.page_data[pageId];
            if (!page || typeof page.slug !== "string") return "";

            const slug = page.slug.replace(/^\/+/, "");
            return `/${slug}`;
        }

        #nextNodeId(page) {
            const nodes = page.nodes || {};
            let nextIndex = Number(page.node_counter) || 0;
            let nodeId = `n${nextIndex}`;

            while (nodes[nodeId]) {
                nextIndex += 1;
                nodeId = `n${nextIndex}`;
            }

            page.node_counter = nextIndex + 1;
            return nodeId;
        }

        #createNode(page, parentId, nodeData) {
            const nodes = page.nodes || {};
            if (!nodes[parentId]) return null;

            const nodeId = this.#nextNodeId(page);
            const nextNode = {
                tag: typeof nodeData?.tag === "string" && nodeData.tag.trim() ? nodeData.tag.trim() : "div",
                parent: parentId,
            };

            if (nodeData?.attrs && typeof nodeData.attrs === "object" && !Array.isArray(nodeData.attrs)) {
                nextNode.attrs = { ...nodeData.attrs };
            }

            if (typeof nodeData?.text === "string") {
                nextNode.text = nodeData.text;
            }

            nodes[nodeId] = nextNode;

            if (!Array.isArray(nodes[parentId].children)) {
                nodes[parentId].children = [];
            }
            nodes[parentId].children.push(nodeId);

            return nodeId;
        }

        #createNodeTreeFromTemplate(page, parentId, templateNode) {
            if (!templateNode || typeof templateNode !== "object") return null;

            const nodeData = {
                tag: templateNode.tag,
                attrs: templateNode.attrs && typeof templateNode.attrs === "object" ? templateNode.attrs : undefined,
                text: typeof templateNode.text === "string" ? templateNode.text : undefined,
            };

            const createdNodeId = this.#createNode(page, parentId, nodeData);
            if (!createdNodeId) return null;

            const children = Array.isArray(templateNode.children) ? templateNode.children : [];
            for (const childTemplate of children) {
                this.#createNodeTreeFromTemplate(page, createdNodeId, childTemplate);
            }

            if (children.length > 0) {
                delete page.nodes[createdNodeId].text;
            }

            return createdNodeId;
        }

        #deleteNodeSubtree(nodes, nodeId) {
            const node = nodes[nodeId];
            if (!node) return;

            const children = Array.isArray(node.children) ? node.children.slice() : [];
            for (const childId of children) {
                this.#deleteNodeSubtree(nodes, childId);
            }

            delete nodes[nodeId];
        }

        #buildHierarchy(nodes, nodeId) {
            const node = nodes[nodeId];
            const childIds = Array.isArray(node.children) ? node.children : [];

            return {
                node_id: nodeId,
                tag: node.tag,
                parent: node.parent,
                children: childIds
                    .filter((childId) => Boolean(nodes[childId]))
                    .map((childId) => this.#buildHierarchy(nodes, childId)),
            };
        }

        #hierarchyToString(tree, depth = 0) {
            const indent = "  ".repeat(depth);
            let out = `${indent}${tree.tag} (${tree.node_id})`;

            for (const child of tree.children) {
                out += `\n${this.#hierarchyToString(child, depth + 1)}`;
            }

            return out;
        }
    }

    window.EzVirtualSite = EzVirtualSite;
})();
