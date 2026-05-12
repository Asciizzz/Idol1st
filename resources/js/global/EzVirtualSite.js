/*
EzVirtualSite 
By Asciiz

# Lightweight virtual multi-page runtime using iframe rendering.

# Pages and data:
    setGlobalStyle(styleElement|cssString)
    setHost(containerElement)
    setData(dataObject)
    init()
    getDataJSON()
    getPageData(id?)  getPageFrame(id?)  getActiveID()
    changePage(id)    load(id?)          reload(id?)
    listPages()       addPage({title,slug})
    removePage(id)    updatePage(id, {title?,slug?})

# Nodes (operate on active page):
    addNode({tag,parent?,attrs?,text?,graph?}) -> id
    readNode(id) -> {page_id,node_id,tag,parent,children,attrs,text,graph}
    writeNode(id, {attrs?,text?,graph?})
    reparentNode(childId, newParentId)
    deleteNode(id, reparentChildren=false)

# Stylesheets:
    listStylesheets()   getStylesheet(name)
    setStylesheet(name, cssData)   removeStylesheet(name)

# Includes (active page by default):
    getPageIncludes(id?)
    addPageInclude(type, name, id?)
    removePageInclude(type, name, id?)

# Scripts:
    addScript(name, scriptData)   removeScript(name)   getScript(name)

# Custom Data:
    setCustomData(path, value)
    getCustomData(path?, fallback?)
    removeCustomData(path)

# Script data shape:
    { 
        variables:{}, actions:{ name:"code with `variables` + `event`" },
        events: { type:[ {selector, action}, ... ] } 
    }
    Listeners attach once per (iframe x type) and never re-add.
    `onload` fires immediately on each load. selector "window" targets contentWindow.
*/

(function () {

    const isObj = v => v !== null && typeof v === "object";
    const isStr = v => typeof v === "string" && v.trim() !== "";
    const clone = v => typeof structuredClone === "function"
        ? structuredClone(v) : JSON.parse(JSON.stringify(v));
    const filterKids = (arr, id) => (arr || []).filter(c => c !== id);
    const toPath = p => Array.isArray(p)
        ? p.map(x => String(x).trim()).filter(Boolean)
        : String(p ?? "").split(".").map(x => x.trim()).filter(Boolean);
    const normalizeAssetName = (name, type = "") => {
        if (!isStr(name)) return "";
        let out = String(name).trim();
        if (type === "css") out = out.replace(/\.css$/i, "");
        if (type === "js") out = out.replace(/\.js$/i, "");
        return out.trim();
    };

    class EzVirtualSite {
        #frames = {};       // key -> iframe
        #active = null;     // active page id
        #data = null;     // project JSON
        #host = null;     // container element
        #rt = {};       // key -> script runtime
        #gstyle = "";       // global CSS text

        #emit(name, detail = {}) {
            document.dispatchEvent(new CustomEvent(name, { detail }));
        }

        #emitPagesChanged() {
            this.#emit("ezvs:pages-changed", {
                pages: this.listPages(),
                currentPageId: this.getActiveID(),
            });
        }

        #emitPageContentChanged() {
            this.#emit("ezvs:page-content-changed", { pageId: this.getActiveID() });
        }

        /* -- setup -- */

        setGlobalStyle(s) {
            this.#gstyle = s instanceof HTMLStyleElement ? s.textContent || "" : (typeof s === "string" ? s : "");
            return this;
        }

        setHost(el) {
            if (!(el instanceof Element)) return null;
            if (this.#host && this.#host !== el) {
                Object.values(this.#frames).forEach(f => el.appendChild(f));
                this.#host.innerHTML = "";
            }
            this.#host = el;
            return this;
        }

        setData(d) {
            if (!isObj(d)) return null;
            this.#data = clone(d);
            this.#data.stylesheets ||= {};
            this.#data.scripts ||= {};
            this.#data.custom ||= {};
            this.#normalizeAssets();
            return this;
        }

        init() {
            if (!(this.#host instanceof Element)) throw new Error("EzVirtualSite: invalid host");
            this.#data ||= this.#emptyData();
            this.#frames = {};
            this.#rt = {};
            this.#host.replaceChildren();
            for (const id in this.#data.pages.page_data) this.#buildFrame(id);
            const start = this.#data.pages.page_start || this.#firstPage();
            if (start) this.changePage(start);

            this.#emit("ezvs:project-ready", {
                pages: this.listPages(),
                currentPageId: this.getActiveID(),
            });

            return this;
        }

        getDataJSON() {
            return this.#data ? clone(this.#data) : null;
        }

        /* -- page API -- */

        load(id = this.#active) {
            const page = this.getPageData(id), frame = this.#frames[this.#key(id)];
            if (!page || !frame) return false;

            const doc = frame.contentDocument;
            if (!doc) return false;

            doc.title = page.title || "";
            this.#renderStyle(doc, page);
            this.#renderNodes(doc, page);
            this.#applyScripts(frame, id, page);
            return true;
        }
        reload(id = this.#active) { return this.load(id); }

        changePage(id = this.#active) {
            const page = this.getPageData(id);
            if (!page) return false;
            this.#normalizePageActiveSelection(page);
            const next = this.#frames[this.#key(id)];
            if (!next) return false;
            this.load(id);
            if (this.#active) { const p = this.#frames[this.#key(this.#active)]; if (p) p.style.display = "none"; }
            next.style.display = "block";
            this.#data.pages.page_start = this.#active = id;

            this.#emit("ezvs:page-selected", { pageId: id });
            this.#emitPagesChanged();

            return true;
        }

        addPage({ title, slug } = {}) {
            const id = `p${this.#data.pages.page_counter++}`;
            this.#data.pages.page_data[id] = {
                title: isStr(title) ? title : "New Page",
                slug: isStr(slug) ? slug : `new-page-${id}`,
                node_counter: 0, nodes: {}, include: { css: [], js: [] }, active_node_id: null
            };
            this.#buildFrame(id);
            this.load(id);

            this.#emitPagesChanged();

            return id;
        }

        removePage(id) {
            if (!this.getPageData(id)) return false;
            delete this.#data.pages.page_data[id];
            const k = this.#key(id);
            this.#frames[k]?.remove();
            delete this.#frames[k];
            delete this.#rt[k];
            if (this.#active === id) {
                const next = this.#firstPage();
                this.#active = next ? (this.changePage(next), next) : null;
            }

            this.#emitPagesChanged();

            return true;
        }

        updatePage(id, u = {}) {
            const p = this.getPageData(id);
            if (!p) return false;
            if ("title" in u) p.title = isStr(u.title) ? u.title : "New Page";
            if ("slug" in u) p.slug = isStr(u.slug) ? u.slug : p.slug;

            this.#emitPagesChanged();

            return true;
        }

        getPageFrame(id = this.#active) { return this.#frames[this.#key(id)] || null; }
        getPageData(id = this.#active) {
            const page = this.#data?.pages?.page_data?.[id] || null;
            if (!page) {
                return null;
            }
            this.#normalizePageShape(page);
            this.#normalizePageActiveSelection(page);
            return page;
        }
        getActiveID() { return this.#active; }
        getActiveNodeId(id = this.#active) {
            const page = this.getPageData(id);
            if (!page) {
                return null;
            }
            return page.active_node_id ?? null;
        }
        setActiveNodeId(nodeId, id = this.#active) {
            const page = this.getPageData(id);
            if (!page) {
                return false;
            }
            if (nodeId === null || nodeId === undefined || nodeId === "") {
                page.active_node_id = null;
                return true;
            }
            const normalizedNodeId = String(nodeId);
            if (!page.nodes[normalizedNodeId]) {
                return false;
            }
            page.active_node_id = normalizedNodeId;
            return true;
        }
        listPages() {
            return Object.entries(this.#data.pages.page_data).map(([id, p]) => ({
                id, title: p.title, slug: p.slug
            }));
        }

        getPageIncludes(id = this.#active) {
            const page = this.getPageData(id);
            if (!page) return null;
            page.include ||= { css: [], js: [] };
            page.include.css ||= [];
            page.include.js ||= [];
            return clone(page.include);
        }

        addPageInclude(type, name, id = this.#active) {
            const page = this.getPageData(id);
            if (!page || (type !== "css" && type !== "js")) return false;
            const normalizedName = normalizeAssetName(name, type);
            if (!normalizedName) return false;

            page.include ||= { css: [], js: [] };
            page.include.css ||= [];
            page.include.js ||= [];

            const list = page.include[type];
            if (!Array.isArray(list)) return false;
            if (list.includes(normalizedName)) return true;

            list.push(normalizedName);

            if (type === "css") this.#reloadMainStyle(id);
            else this.load(id);

            this.#emitPageContentChanged();
            return true;
        }

        removePageInclude(type, name, id = this.#active) {
            const page = this.getPageData(id);
            if (!page || (type !== "css" && type !== "js")) return false;
            const normalizedName = normalizeAssetName(name, type);
            if (!normalizedName) return false;

            page.include ||= { css: [], js: [] };
            page.include.css ||= [];
            page.include.js ||= [];

            const list = page.include[type];
            if (!Array.isArray(list)) return false;

            const next = list.filter(n => n !== normalizedName);
            if (next.length === list.length) return true;

            page.include[type] = next;

            if (type === "css") this.#reloadMainStyle(id);
            else this.load(id);

            this.#emitPageContentChanged();
            return true;
        }


        /* -- node API -- */

        addNode(d = {}) {
            const page = this.getPageData(this.#active);
            if (!page) return null;
            const parent = isStr(d.parent) ? d.parent : null;
            if (parent && !page.nodes[parent]) return null;
            const id = this.#nextNodeId(page);
            page.nodes[id] = {
                tag: d.tag || "div", parent,
                attrs: isObj(d.attrs) ? clone(d.attrs) : undefined,
                text: typeof d.text === "string" ? d.text : undefined,
                graph: d.graph || null
            };
            if (parent) (page.nodes[parent].children ||= []).push(id);

            this.#reloadMainBody(this.#active);
            this.#normalizePageActiveSelection(page);
            this.#emitPageContentChanged();
            return id;
        }

        readNode(id) {
            const page = this.getPageData(this.#active);
            if (!page) return null;

            const n = page.nodes[id];
            if (!n) return null;

            return {
                page_id: this.#active, node_id: id, tag: n.tag, parent: n.parent,
                children: n.children || [], text: n.text ?? null, attrs: n.attrs ?? null, graph: n.graph ?? null
            };
        }

        writeNode(id, { attrs, text, graph } = {}) {
            const page = this.getPageData(this.#active);
            if (!page) return false;

            const n = page.nodes[id]; if (!n) return false;
            if (attrs !== undefined) n.attrs = attrs;
            if (text !== undefined) n.text = text;
            if (graph !== undefined) n.graph = graph;

            this.#reloadMainBody(this.#active);
            this.#normalizePageActiveSelection(page);
            this.#emitPageContentChanged();
            return true;
        }

        reparentNode(childId, newParentId) {
            const page = this.getPageData(this.#active); if (!page) return false;
            const { nodes } = page;
            const child = nodes[childId], pid = isStr(newParentId) ? newParentId : null, np = pid ? nodes[pid] : null;
            if (!child || (pid && !np)) return false;
            for (let c = pid; c; c = nodes[c]?.parent) if (c === childId) return false; // cycle guard
            const op = child.parent ? nodes[child.parent] : null;
            if (op) op.children = filterKids(op.children, childId);
            if (np) (np.children ||= []).push(childId);
            child.parent = pid;

            this.#reloadMainBody(this.#active);
            this.#normalizePageActiveSelection(page);
            this.#emitPageContentChanged();
            return true;
        }

        deleteNode(id, reparentChildren = false) {
            const page = this.getPageData(this.#active); if (!page) return false;
            const { nodes } = page;
            const node = nodes[id]; if (!node) return false;
            const parent = node.parent ? nodes[node.parent] : null;
            const children = node.children || [];
            if (reparentChildren) {
                if (parent) parent.children = filterKids(parent.children, id);
                for (const cid of children) {
                    const child = nodes[cid]; if (!child) continue;
                    child.parent = node.parent ?? null;
                    if (parent) (parent.children ||= []).push(cid);
                }
            } else {
                const cascade = nid => { 
                    const n = nodes[nid];
                    if (!n) return;
                    (n.children || []).forEach(cascade);
                    delete nodes[nid];
                };
                cascade(id);
                if (parent) parent.children = filterKids(parent.children, id);

                this.#reloadMainBody(this.#active);
                this.#normalizePageActiveSelection(page);
                this.#emitPageContentChanged();
                return true;
            }
            delete nodes[id];

            this.#reloadMainBody(this.#active);
            this.#normalizePageActiveSelection(page);
            this.#emitPageContentChanged();
            return true;
        }

        /* -- stylesheet API -- */

        listStylesheets() {
            return Object.keys(this.#data.stylesheets || {});
        }

        getStylesheet(name) {
            const normalizedName = normalizeAssetName(name, "css");
            if (!normalizedName) return null;
            const cssData = this.#data.stylesheets?.[normalizedName];
            return cssData === undefined ? null : clone(cssData);
        }

        setStylesheet(name, cssData) {
            const normalizedName = normalizeAssetName(name, "css");
            if (!normalizedName || (!isObj(cssData) && typeof cssData !== "string")) return false;
            this.#data.stylesheets ||= {};
            this.#data.stylesheets[normalizedName] = clone(cssData);
            this.#reloadMainStyle(this.#active);
            this.#emitPageContentChanged();
            return true;
        }

        removeStylesheet(name) {
            const normalizedName = normalizeAssetName(name, "css");
            if (!normalizedName || !this.#data.stylesheets?.[normalizedName]) return false;
            delete this.#data.stylesheets[normalizedName];

            Object.values(this.#data.pages.page_data || {}).forEach(page => {
                page.include ||= { css: [], js: [] };
                page.include.css ||= [];
                page.include.css = page.include.css.filter(n => n !== normalizedName);
            });

            this.#reloadMainStyle(this.#active);
            this.#emitPageContentChanged();
            return true;
        }

        /* -- script API -- */

        addScript(name, data) {
            const normalizedName = normalizeAssetName(name, "js");
            if (!normalizedName || !isObj(data)) return false;
            this.#data.scripts[normalizedName] = clone(data);
            return true;
        }

        removeScript(name) {
            const normalizedName = normalizeAssetName(name, "js");
            if (!normalizedName || !this.#data.scripts[normalizedName]) return false;
            delete this.#data.scripts[normalizedName]; return true;
        }

        getScript(name) {
            const normalizedName = normalizeAssetName(name, "js");
            return normalizedName && this.#data.scripts[normalizedName] ? clone(this.#data.scripts[normalizedName]) : null;
        }

        /* -- custom data API -- */

        setCustomData(path, value) {
            const parts = toPath(path);
            if (parts.length === 0) return false;

            this.#data.custom ||= {};
            let current = this.#data.custom;

            for (let i = 0; i < parts.length - 1; i++) {
                const key = parts[i];
                if (!isObj(current[key])) current[key] = {};
                current = current[key];
            }

            current[parts[parts.length - 1]] = clone(value);
            this.#emit("ezvs:custom-data-changed", { path: parts.join(".") });
            return true;
        }

        getCustomData(path = null, fallback = null) {
            this.#data.custom ||= {};

            if (path === null || path === undefined || path === "") {
                return clone(this.#data.custom);
            }

            const parts = toPath(path);
            if (parts.length === 0) return clone(this.#data.custom);

            let current = this.#data.custom;
            for (const key of parts) {
                if (!isObj(current) || !(key in current)) {
                    return fallback;
                }
                current = current[key];
            }

            return clone(current);
        }

        removeCustomData(path) {
            const parts = toPath(path);
            if (parts.length === 0) return false;

            this.#data.custom ||= {};
            let current = this.#data.custom;
            for (let i = 0; i < parts.length - 1; i++) {
                const key = parts[i];
                if (!isObj(current[key])) return false;
                current = current[key];
            }

            const leaf = parts[parts.length - 1];
            if (!(leaf in current)) return false;
            delete current[leaf];
            this.#emit("ezvs:custom-data-changed", { path: parts.join(".") });
            return true;
        }

        /* -- rendering -- */

        #renderNodes(doc, page) {
            const mount = doc.getElementById("ez-virtualsite-main") || doc.body; if (!mount) return;
            mount.replaceChildren();
            const { nodes } = page, cache = new Map(), visiting = new Set();
            const build = id => {
                if (cache.has(id)) return cache.get(id);
                if (visiting.has(id)) return null;
                const n = nodes[id]; if (!n) return null;
                visiting.add(id);
                const el = doc.createElement(n.tag || "div");
                this.#applyAttrs(el, n.attrs);
                el.dataset.vsNodeId = id;
                if (typeof n.text === "string") el.appendChild(doc.createTextNode(n.text));
                (n.children || []).forEach(cid => { const c = build(cid); if (c) el.appendChild(c); });
                visiting.delete(id); cache.set(id, el); return el;
            };
            Object.keys(nodes)
                .filter(id => { const pid = nodes[id]?.parent; return !isStr(pid) || !nodes[pid]; })
                .forEach(rid => { const el = build(rid); if (el) mount.appendChild(el); });
        }

        #renderStyle(doc, page) {
            this.#styleEl(doc, "ez-virtualsite-global-style").textContent = this.#gstyle;
            this.#styleEl(doc, "ez-virtualsite-style").textContent = (page.include?.css || [])
                .map(n => { const a = this.#data.stylesheets?.[n]; return a ? 
                        `/* ${n} */\n${typeof a === "string" ? a :
                        this.#css(a)}` : ""; })
                .filter(Boolean).join("\n\n");
        }

        #reloadMainBody(pageId = this.#active) {
            const page = this.getPageData(pageId);
            const frame = this.#frames[this.#key(pageId)];
            if (!page || !frame) return false;

            const doc = frame.contentDocument;
            if (!doc) return false;

            this.#renderNodes(doc, page);
            return true;
        }

        #reloadMainStyle(pageId = this.#active) {
            const page = this.getPageData(pageId);
            const frame = this.#frames[this.#key(pageId)];
            if (!page || !frame) return false;

            const doc = frame.contentDocument;
            if (!doc) return false;

            this.#renderStyle(doc, page);
            return true;
        }

        /* -- script runtime --
           One delegated listener per (iframe x eventType), attached once, never re-added.
           On load/reload only rt.variables and rt.actions are refreshed — the listener
           closure reads the same rt reference so it automatically sees the new data. */

        #applyScripts(frame, pageId, page) {
            const key = this.#key(pageId);
            const doc = frame.contentDocument, win = frame.contentWindow;
            if (!doc || !win) return;

            const rt = this.#rt[key] ||= { variables: {}, actions: {}, docTypes: new Set(), winTypes: new Set() };

            const merged = { variables: {}, actions: {}, events: {} };
            for (const name of (page.include?.js || [])) {
                const s = this.#data.scripts?.[name]; if (!isObj(s)) continue;
                Object.assign(merged.variables, s.variables || {});
                Object.assign(merged.actions, s.actions || {});
                for (const [type, bindings] of Object.entries(s.events || {}))
                    (merged.events[type] ||= []).push(...bindings);
            }

            rt.variables = merged.variables;
            rt.actions = merged.actions;

            for (const [type, bindings] of Object.entries(merged.events)) {
                if (type === "onload") {
                    bindings.filter(b => b.selector === "window")
                        .forEach(b => this.#exec(rt, b.action, new Event("load")));
                    continue;
                }
                if (!rt.docTypes.has(type)) { doc.addEventListener(type, e => this.#fire(rt, doc, type, e)); rt.docTypes.add(type); }
                if (bindings.some(b => b.selector === "window") && !rt.winTypes.has(type)) {
                    win.addEventListener(type, e => this.#fire(rt, null, type, e)); rt.winTypes.add(type);
                }
            }
        }

        // Unified dispatcher — doc=null means window-scoped
        #fire(rt, doc, type, event) {
            for (const s of Object.values(this.#data.scripts || {}))
                for (const b of (s.events?.[type] || []))
                    if (!doc) { if (b.selector === "window") this.#exec(rt, b.action, event); }
                    else {
                        if (b.selector === "window") continue;
                        try {
                            for (const el of doc.querySelectorAll(b.selector))
                                if (el === event.target || el.contains(event.target)) this.#exec(rt, b.action, event);
                        } catch (_) { }
                    }
        }

        #exec(rt, name, event) {
            const code = rt.actions[name]; if (typeof code !== "string") return;
            try { new Function("variables", "event", code)(rt.variables, event); }
            catch (e) { console.warn(`[EzVirtualSite] action "${name}" threw:`, e); }
        }

        /* -- utils -- */

        #applyAttrs(el, attrs) {
            for (const [k, v] of Object.entries(attrs || {})) {
                if (k === "_href_id") {
                    el.dataset.hrefId = v;
                    if (el.tagName === "A") { const p = this.getPageData(v); if (p) el.href = "/" + p.slug; }
                } else if (!k.startsWith("_")) { el.setAttribute(k, v); }
            }
        }

        #css(obj) {
            return Object.entries(obj).map(([sel, rules]) =>
                `${sel}{${Object.entries(rules).map(([k, v]) => `${k.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}:${v}`).join(";")}}`
            ).join("");
        }

        #styleEl(doc, id) {
            let el = doc.getElementById(id);
            if (!el) { el = doc.createElement("style"); el.id = id; (doc.head || doc.documentElement).appendChild(el); }
            return el;
        }

        #key(id) { return `ez-virtualsite-${id}`; }

        #nextNodeId(page) {
            let i = page.node_counter || 0;
            while (page.nodes[`n${i}`]) i++;
            page.node_counter = i + 1;
            return `n${i}`;
        }

        #buildFrame(id) {
            const k = this.#key(id), f = document.createElement("iframe");
            f.id = k; f.style.cssText = "width:100%;height:100%;border:0;display:none;";
            this.#host.appendChild(f); this.#frames[k] = f;
            const doc = f.contentDocument; if (!doc) return false;
            doc.open();
            doc.write(`<!DOCTYPE html><html><head><style id="ez-virtualsite-global-style"></style><style id="ez-virtualsite-style"></style></head><body id="ez-virtualsite-main"></body></html>`);
            doc.close();
            return true;
        }
        #firstPage() { return Object.keys(this.#data.pages.page_data)[0] || null; }

        #normalizeAssets() {
            const nextStyles = {};
            for (const [rawName, styleData] of Object.entries(this.#data.stylesheets || {})) {
                const normalizedName = normalizeAssetName(rawName, "css");
                if (!normalizedName) continue;
                nextStyles[normalizedName] = styleData;
            }
            this.#data.stylesheets = nextStyles;

            const nextScripts = {};
            for (const [rawName, scriptData] of Object.entries(this.#data.scripts || {})) {
                const normalizedName = normalizeAssetName(rawName, "js");
                if (!normalizedName) continue;
                nextScripts[normalizedName] = scriptData;
            }
            this.#data.scripts = nextScripts;

            Object.values(this.#data.pages?.page_data || {}).forEach(page => {
                this.#normalizePageShape(page);
                page.include ||= { css: [], js: [] };
                page.include.css = Array.from(
                    new Set((Array.isArray(page.include.css) ? page.include.css : [])
                        .map(name => normalizeAssetName(name, "css"))
                        .filter(Boolean))
                );
                page.include.js = Array.from(
                    new Set((Array.isArray(page.include.js) ? page.include.js : [])
                        .map(name => normalizeAssetName(name, "js"))
                        .filter(Boolean))
                );
                this.#normalizePageActiveSelection(page);
            });
        }

        #normalizePageShape(page) {
            if (!isObj(page)) {
                return;
            }
            page.nodes ||= {};
            page.include ||= { css: [], js: [] };
            page.include.css ||= [];
            page.include.js ||= [];
            if (!("active_node_id" in page)) {
                page.active_node_id = null;
            }
        }

        #normalizePageActiveSelection(page) {
            if (!isObj(page)) {
                return;
            }
            this.#normalizePageShape(page);
            const nodeId = page.active_node_id;
            if (nodeId === null || nodeId === undefined || nodeId === "") {
                page.active_node_id = null;
                return;
            }
            const normalizedNodeId = String(nodeId);
            page.active_node_id = page.nodes[normalizedNodeId] ? normalizedNodeId : null;
        }

        #emptyData() {
            return {
                pages: {
                    page_start: "p0", page_counter: 1, page_data: {
                        p0: { title: "New Page", slug: "new-page", node_counter: 0, nodes: {}, include: { css: [], js: [] }, active_node_id: null }
                    }
                }, stylesheets: {}, scripts: {}, custom: {}
            };
        }
    }

    window.EzVirtualSite = EzVirtualSite;

})();
