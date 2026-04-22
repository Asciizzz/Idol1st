(function() {
    const el = {
        app: document.querySelector("#app"),
        canvas: document.querySelector("#canvas"),
    };

    function emit(name, detail) {
        document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    }

    function slugify(input) {
        return String(input || "new-page")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9\/_-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^[-/]+|[-/]+$/g, "") || "new-page";
    }

    function buildBreadcrumbText(elm) {
        const parts = [];
        let current = elm;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
            parts.push(current.tagName.toLowerCase());
            if (current.tagName.toLowerCase() === "body") break;
            current = current.parentElement;
        }

        return parts.reverse().join(" > ");
    }

    const runtime = {
        site: null,
        floater: null,
        nodeQueryKeys: new Set(),
    };

    function frameScopeQuery(pageId) {
        if (typeof pageId !== "string" || !pageId.trim()) return null;
        return `@ez-${pageId} [data-vs-node-id]`;
    }

    function syncFloaterNodeQueries() {
        if (!runtime.floater) return;
        if (!runtime.site) return;

        const pages = runtime.site.listPages();
        const nextQueries = new Set();

        for (const page of pages) {
            const query = frameScopeQuery(page.id);
            if (!query) continue;
            nextQueries.add(query);
        }

        for (const query of runtime.nodeQueryKeys) {
            if (!nextQueries.has(query)) {
                runtime.floater.removeQuery(query);
            }
        }

        for (const query of nextQueries) {
            if (!runtime.nodeQueryKeys.has(query)) {
                runtime.floater.addQuery(query, { display: "node" });
            }
        }

        runtime.nodeQueryKeys = nextQueries;
    }

    function handleSiteNavigate(detail = {}) {
        const pageId = typeof detail.toPageId === "string" ? detail.toPageId : runtime.site?.getActiveID();
        if (!pageId || !runtime.site) return;

        syncFloaterNodeQueries();
        emit("wc:page-selected", { pageId });
        emit("wc:pages-changed", {
            pages: runtime.site.listPages(),
            currentPageId: runtime.site.getActiveID(),
        });
    }

    function setupFloater() {
        if (!window.EzFloater) return;

        const floater = new window.EzFloater();
        runtime.floater = floater;

        floater.addAction("change-page-properties", (button) => {
            if (!window.WebConstruct) return;

            const pageId = button.dataset.pageId;
            const titleInput = floater.floater.querySelector("#floater-page-title");
            const slugInput = floater.floater.querySelector("#floater-page-slug");

            const result = window.WebConstruct.updatePageProperties(pageId, {
                title: titleInput ? titleInput.value : "",
                slug: slugInput ? slugInput.value : "",
            });

            if (result.ok) {
                floater.hideFloater();
            }
        });

        floater.addAction("delete-node", (button) => {
            if (!window.WebConstruct) return;

            const nodeId = button.dataset.nodeId;
            const isConfirmed = button.dataset.confirmed === "true";
            if (!isConfirmed) {
                button.dataset.confirmed = "true";
                button.classList.add("danger");
                button.textContent = "Are you sure?";
                return;
            }

            const result = window.WebConstruct.deleteNode(nodeId);
            if (result.ok) {
                floater.hideFloater();
                return;
            }

            button.textContent = result.message || "Delete failed";
        });

        floater.addDisplay("page-item", {
            context(pageItem) {
                if (!window.WebConstruct) return "Page API unavailable.";

                const pageId = pageItem.dataset.pageId;
                const page = window.WebConstruct.getPage(pageId);
                if (!page) return "Page not found.";

                const wrapper = document.createElement("div");
                wrapper.className = "floater-form";

                const title = document.createElement("div");
                title.className = "floater-title";
                title.textContent = "Edit Page";

                const titleLabel = document.createElement("label");
                titleLabel.className = "floater-label";
                titleLabel.htmlFor = "floater-page-title";
                titleLabel.textContent = "Title";

                const titleInput = document.createElement("input");
                titleInput.id = "floater-page-title";
                titleInput.className = "floater-input";
                titleInput.type = "text";
                titleInput.value = page.title || "";

                const slugLabel = document.createElement("label");
                slugLabel.className = "floater-label";
                slugLabel.htmlFor = "floater-page-slug";
                slugLabel.textContent = "Slug";

                const slugInput = document.createElement("input");
                slugInput.id = "floater-page-slug";
                slugInput.className = "floater-input";
                slugInput.type = "text";
                slugInput.value = page.slug || "";

                const submit = document.createElement("button");
                submit.type = "button";
                submit.className = "floater-button";
                submit.dataset.click = "change-page-properties";
                submit.dataset.pageId = pageId;
                submit.textContent = "Apply";

                wrapper.append(title, titleLabel, titleInput, slugLabel, slugInput, submit);
                return wrapper;
            },
            tooltip(pageItem) {
                if (!window.WebConstruct) return null;

                const pageId = pageItem.dataset.pageId;
                const page = window.WebConstruct.getPage(pageId);
                if (!page) return null;

                const wrapper = document.createElement("div");
                wrapper.className = "floater-form";

                const title = document.createElement("div");
                title.className = "floater-title";
                title.textContent = "Page";

                const rowTitle = document.createElement("div");
                rowTitle.className = "floater-breadcrumb";
                rowTitle.textContent = `Title: ${page.title || "Untitled"}`;

                const rowSlug = document.createElement("div");
                rowSlug.className = "floater-breadcrumb";
                rowSlug.textContent = `Slug: ${page.slug || "no-slug"}`;

                wrapper.append(title, rowTitle, rowSlug);
                return wrapper;
            },
        });

        floater.addDisplay("node", {
            context(nodeElm) {
                const wrapper = document.createElement("div");
                wrapper.className = "floater-form";

                const title = document.createElement("div");
                title.className = "floater-title";
                title.textContent = "Element";

                const crumb = document.createElement("div");
                crumb.className = "floater-breadcrumb";
                crumb.textContent = buildBreadcrumbText(nodeElm);

                const nodeId = nodeElm.getAttribute("data-vs-node-id") || "";
                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.className = "floater-button";
                deleteButton.dataset.click = "delete-node";
                deleteButton.dataset.nodeId = nodeId;
                deleteButton.dataset.confirmed = "false";
                deleteButton.textContent = "Delete";

                wrapper.append(title, crumb, deleteButton);
                return wrapper;
            },
            tooltip(nodeElm) {
                if (nodeElm.tagName.toLowerCase() === "body") {
                    return null;
                }

                const wrapper = document.createElement("div");
                wrapper.className = "floater-form";

                const title = document.createElement("div");
                title.className = "floater-title";
                title.textContent = "Element";

                const crumb = document.createElement("div");
                crumb.className = "floater-breadcrumb";
                crumb.textContent = buildBreadcrumbText(nodeElm);

                wrapper.append(title, crumb);
                return wrapper;
            },
        });

        floater.addQuery(".page-item", { display: "page-item" });
        syncFloaterNodeQueries();
    }

    function createWebConstructAdapter(site) {
        return {
            getProjectJSON() {
                return site.getDataJSON();
            },

            getPages() {
                return site.listPages();
            },

            getPage(pageId) {
                return site.getPage(pageId);
            },

            getCurrentPageId() {
                return site.getActiveID();
            },

            setCurrentPage(pageId) {
                if (!site.setActivePage(pageId)) {
                    return { ok: false, message: "Page not found." };
                }

                syncFloaterNodeQueries();
                emit("wc:page-selected", { pageId });
                emit("wc:pages-changed", {
                    pages: site.listPages(),
                    currentPageId: site.getActiveID(),
                });

                return { ok: true, pageId };
            },

            createPage(titleInput, slugInput) {
                const title = String(titleInput || "New Page").trim() || "New Page";
                const slug = slugify(slugInput || title);
                const pageId = site.addPage({ title, slug });
                if (!pageId) {
                    return { ok: false, message: "Failed to create page." };
                }

                syncFloaterNodeQueries();
                emit("wc:pages-changed", {
                    pages: site.listPages(),
                    currentPageId: site.getActiveID(),
                });

                return { ok: true, pageId };
            },

            deletePage(pageId) {
                if (!site.removePage(pageId)) {
                    return { ok: false, message: "Page not found or cannot remove last page." };
                }

                syncFloaterNodeQueries();
                emit("wc:pages-changed", {
                    pages: site.listPages(),
                    currentPageId: site.getActiveID(),
                });

                return { ok: true };
            },

            updatePageProperties(pageId, updates) {
                const payload = {
                    title: String((updates && updates.title) || "").trim(),
                    slug: slugify((updates && updates.slug) || ""),
                };

                if (!payload.title) {
                    return { ok: false, message: "Title is required." };
                }

                if (!site.updatePage(pageId, payload)) {
                    return { ok: false, message: "Page not found." };
                }

                emit("wc:pages-changed", {
                    pages: site.listPages(),
                    currentPageId: site.getActiveID(),
                });

                return { ok: true };
            },

            deleteNode(nodeId) {
                if (!site.deleteNode(nodeId)) {
                    return { ok: false, message: "Are you an idiot?" };
                }

                emit("wc:page-content-changed", { pageId: site.getActiveID() });
                return { ok: true };
            },

            getHierarchy(nodeId, format) {
                return site.getHierarchy(nodeId, format);
            },
        };
    }

    async function resolveInitialProject() {
        const initialProject = window.webConstructInitialProject;
        if (initialProject && typeof initialProject === "object") {
            return initialProject;
        }

        const initialProjectUrl = window.webConstructInitialProjectUrl || "/jsons/example.json";
        const response = await fetch(initialProjectUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    }

    async function bootstrapEditor() {
        if (!window.EzVirtualSite) {
            throw new Error("EzVirtualSite is not loaded.");
        }

        if (!el.canvas) {
            throw new Error("Editor canvas host not found.");
        }

        const data = await resolveInitialProject();
        const site = new window.EzVirtualSite();

        window.vsite = site; // for testing/debugging

        site.init({
            host: el.canvas,
            dataJSON: data,
            autosave: true,
            onNavigate: handleSiteNavigate,
        });

        const globalStyle = document.createElement("style");
        globalStyle.textContent = `
            [data-vs-node-id] {
                outline: 1px solid transparent;
                outline-offset: -1px;
            }
            .ez-virtualsite-hover {
                outline: 2px solid #ff4d4f !important;
                outline-offset: -1px;
            }
            .ez-virtualsite-selected {
                outline: 2px solid #ff1f1f !important;
                outline-offset: -1px;
            }
            .ez-virtualsite-dragover {
                outline: 2px dashed #ff7875 !important;
                outline-offset: -1px;
            }
        `;
        // site.setGlobalStyle(globalStyle);

        runtime.site = site;
        window.WebConstruct = createWebConstructAdapter(site);

        setupFloater();

        emit("wc:project-ready", {
            pages: site.listPages(),
            currentPageId: site.getActiveID(),
        });

        emit("wc:pages-changed", {
            pages: site.listPages(),
            currentPageId: site.getActiveID(),
        });
    }

    bootstrapEditor().catch((error) => {
        console.error("[editor] Failed to initialize:", error);
        if (el.app) {
            el.app.textContent = `Failed to initialize editor: ${error.message}`;
        }
    });
})();