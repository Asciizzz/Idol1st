(function() {
    const el = {
        app: document.querySelector('#app'),
        canvas: document.querySelector('#canvas'),
    };

    const runtime = {
        site: null,
        floater: null,
        nodeQueryKeys: new Set(),
        frameDnDKeys: new Set(),
    };

    function emit(name, detail) {
        document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    }

    function resolveInitialProject() {
        const initialProject = window.webConstructInitialProject;
        if (initialProject && typeof initialProject === 'object') {
            return Promise.resolve(initialProject);
        }

        const initialProjectUrl = window.webConstructInitialProjectUrl || '/jsons/example.json';
        return fetch(initialProjectUrl).then(function(response) {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return response.json();
        });
    }

    async function bootstrapEditor() {
        if (!window.EzVirtualSite) {
            throw new Error('EzVirtualSite is not loaded.');
        }

        if (!el.canvas) {
            throw new Error('Editor canvas host not found.');
        }

        const data = await resolveInitialProject();
        const site = new window.EzVirtualSite();

        runtime.site = site;
        window.vsite = site;

        const globalStyle = document.createElement('style');
        globalStyle.textContent = `
            [data-vs-node-id] {
                outline: 1px solid transparent;
                outline-offset: -1px;
            }

            [data-vs-node-id]:hover {
                outline: 2px solid #ff4d4f;
                outline-offset: -1px;
            }

            [data-vs-node-id][data-vs-drop-target="true"] {
                outline: 2px dashed #1890ff;
                outline-offset: -1px;
            }
        `;

        site.setGlobalStyle(globalStyle)
            .setHost(el.canvas)
            .setData(data)
            .init();

        setupFloater();
        wireFrameDnD();
        bindRuntimeEvents();

        if (el.app) {
            el.app.setAttribute('data-editor-ready', 'true');
        }
    }

    // ============= Floater Utilities =============

    function buildBreadcrumbText(element) {
        const parts = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
            parts.push(current.tagName.toLowerCase());
            if (current.tagName.toLowerCase() === 'body') {
                break;
            }
            current = current.parentElement;
        }

        return parts.reverse().join(' > ');
    }

    function frameScopeQuery(pageId) {
        if (typeof pageId !== 'string' || !pageId.trim()) {
            return null;
        }

        return `@ez-virtualsite-${pageId} [data-vs-node-id]`;
    }

    function syncFloaterNodeQueries() {
        if (!runtime.floater || !runtime.site) {
            return;
        }

        const nextQueries = new Set();
        const pages = runtime.site.listPages();

        for (const page of pages) {
            const query = frameScopeQuery(page.id);
            if (query) {
                nextQueries.add(query);
            }
        }

        for (const query of runtime.nodeQueryKeys) {
            if (!nextQueries.has(query)) {
                runtime.floater.removeQuery(query);
            }
        }

        for (const query of nextQueries) {
            if (!runtime.nodeQueryKeys.has(query)) {
                runtime.floater.addQuery(query, { display: 'node' });
            }
        }

        runtime.nodeQueryKeys = nextQueries;
    }

    function hideActivePageEditor(button) {
        const floater = runtime.floater;
        if (!floater || !button) {
            return;
        }

        button.dataset.confirmed = 'false';
        button.classList.remove('danger');
        button.textContent = 'Delete';
        floater.hide();
    }

    // ============= Drag And Drop =============

    function normalizeTemplateContent(payload) {
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        if (payload.content && typeof payload.content === 'object') {
            return payload.content;
        }

        if (payload.tag || payload.children || payload.text || payload.attrs) {
            return payload;
        }

        return null;
    }

    function createNodeTree(site, nodeContent, parentId) {
        if (!site || !nodeContent || typeof nodeContent !== 'object') {
            return null;
        }

        const nodeId = site.addNode({
            tag: nodeContent.tag || 'div',
            parent: parentId || null,
            attrs: nodeContent.attrs && typeof nodeContent.attrs === 'object' ? nodeContent.attrs : undefined,
            text: typeof nodeContent.text === 'string' ? nodeContent.text : undefined,
            graph: nodeContent.graph || null,
        });

        if (!nodeId) {
            return null;
        }

        const children = Array.isArray(nodeContent.children) ? nodeContent.children : [];
        for (const childContent of children) {
            createNodeTree(site, childContent, nodeId);
        }

        return nodeId;
    }

    function getDropParentNodeId(event) {
        if (!event || !event.target || !event.target.closest) {
            return null;
        }

        const nodeElement = event.target.closest('[data-vs-node-id]');
        return nodeElement ? (nodeElement.getAttribute('data-vs-node-id') || null) : null;
    }

    function setDragOverState(event, isActive) {
        if (!event || !event.target || !event.target.closest) {
            return;
        }

        const nodeElement = event.target.closest('[data-vs-node-id]');
        if (!nodeElement) {
            return;
        }

        if (isActive) {
            nodeElement.setAttribute('data-vs-drop-target', 'true');
            return;
        }

        nodeElement.removeAttribute('data-vs-drop-target');
    }

    function clearDropTargetState(doc) {
        if (!doc || !doc.querySelectorAll) {
            return;
        }

        doc.querySelectorAll('[data-vs-drop-target="true"]').forEach(function(element) {
            element.removeAttribute('data-vs-drop-target');
        });
    }

    function ensureNodesDraggable(doc) {
        if (!doc || !doc.querySelectorAll) {
            return;
        }

        doc.querySelectorAll('[data-vs-node-id]').forEach(function(element) {
            element.setAttribute('draggable', 'true');
        });
    }

    function handleFrameDragStart(event) {
        if (!event || !event.dataTransfer || !event.target || !event.target.closest) {
            return;
        }

        const nodeElement = event.target.closest('[data-vs-node-id]');
        if (!nodeElement) {
            return;
        }

        const nodeId = nodeElement.getAttribute('data-vs-node-id');
        if (!nodeId) {
            return;
        }

        event.dataTransfer.setData('application/x-ezvs-node-id', nodeId);
        event.dataTransfer.effectAllowed = 'move';
    }

    function handleFrameDragOver(event) {
        if (!event || !event.dataTransfer) {
            return;
        }

        const types = event.dataTransfer.types || [];
        const hasTemplate = types.includes('application/x-ezvs-template');
        const hasNode = types.includes('application/x-ezvs-node-id');
        if (!hasTemplate && !hasNode) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = hasTemplate ? 'copy' : 'move';
        setDragOverState(event, true);
    }

    function handleFrameDragLeave(event) {
        setDragOverState(event, false);
    }

    function handleFrameDragEnd(event) {
        const doc = event && event.view && event.view.document ? event.view.document : null;
        clearDropTargetState(doc);
    }

    function handleFrameDrop(event) {
        const site = runtime.site;
        if (!site || !event || !event.dataTransfer) {
            return;
        }

        event.preventDefault();

        const targetParentId = getDropParentNodeId(event);
        const templateJSON = event.dataTransfer.getData('application/x-ezvs-template');
        const draggedNodeId = event.dataTransfer.getData('application/x-ezvs-node-id');

        if (templateJSON) {
            try {
                const templatePayload = JSON.parse(templateJSON);
                const templateContent = normalizeTemplateContent(templatePayload);
                if (templateContent) {
                    createNodeTree(site, templateContent, targetParentId);
                }
            } catch (_) {
                // Ignore invalid template payloads.
            }
        } else if (draggedNodeId) {
            if (draggedNodeId !== targetParentId) {
                site.reparentNode(draggedNodeId, targetParentId || null);
            }
        }

        const doc = event.view && event.view.document ? event.view.document : null;
        clearDropTargetState(doc);
    }

    function wireFrameDnD() {
        const site = runtime.site;
        if (!site) {
            return;
        }

        const nextKeys = new Set();
        const pages = site.listPages();

        for (const page of pages) {
            const frame = site.getPageFrame(page.id);
            const doc = frame ? frame.contentDocument : null;
            if (!frame || !doc) {
                continue;
            }

            nextKeys.add(page.id);

            if (!runtime.frameDnDKeys.has(page.id)) {
                doc.addEventListener('dragstart', handleFrameDragStart);
                doc.addEventListener('dragover', handleFrameDragOver);
                doc.addEventListener('dragleave', handleFrameDragLeave);
                doc.addEventListener('dragend', handleFrameDragEnd);
                doc.addEventListener('drop', handleFrameDrop);
            }

            ensureNodesDraggable(doc);
        }

        runtime.frameDnDKeys = nextKeys;
    }

    function setupFloater() {
        if (!window.EzFloater) {
            return;
        }

        const floater = new window.EzFloater();
        runtime.floater = floater;
        window.editorFloater = floater;

        floater.addAction('change-page-properties', function(button) {
            const site = runtime.site;
            if (!site) {
                return;
            }

            const pageId = button.dataset.pageId;
            const titleInput = floater.floater.querySelector('#floater-page-title');
            const slugInput = floater.floater.querySelector('#floater-page-slug');
            const title = titleInput ? titleInput.value.trim() : '';
            const slug = slugInput ? slugInput.value.trim() : '';

            if (!title) {
                button.textContent = 'Title is required';
                return;
            }

            if (!site.updatePage(pageId, { title: title, slug: slug })) {
                button.textContent = 'Page not found';
                return;
            }

            hideActivePageEditor(button);
        });

        floater.addAction('delete-node', function(button) {
            const site = runtime.site;
            if (!site) {
                return;
            }

            const nodeId = button.dataset.nodeId;
            const isConfirmed = button.dataset.confirmed === 'true';

            if (!isConfirmed) {
                button.dataset.confirmed = 'true';
                button.classList.add('danger');
                button.textContent = 'Are you sure?';
                return;
            }

            if (!site.deleteNode(nodeId)) {
                button.textContent = 'Delete failed';
                return;
            }

            floater.hide();
        });

        floater.addDisplay('page-item', {
            context(pageItem) {
                const site = runtime.site;
                if (!site) {
                    return 'Page API unavailable.';
                }

                const pageId = pageItem.dataset.pageId;
                const page = site.getPageData(pageId);
                if (!page) {
                    return 'Page not found.';
                }

                const wrapper = document.createElement('div');
                wrapper.className = 'floater-form';

                const title = document.createElement('div');
                title.className = 'floater-title';
                title.textContent = 'Edit Page';

                const titleLabel = document.createElement('label');
                titleLabel.className = 'floater-label';
                titleLabel.htmlFor = 'floater-page-title';
                titleLabel.textContent = 'Title';

                const titleInput = document.createElement('input');
                titleInput.id = 'floater-page-title';
                titleInput.className = 'floater-input';
                titleInput.type = 'text';
                titleInput.value = page.title || '';

                const slugLabel = document.createElement('label');
                slugLabel.className = 'floater-label';
                slugLabel.htmlFor = 'floater-page-slug';
                slugLabel.textContent = 'Slug';

                const slugInput = document.createElement('input');
                slugInput.id = 'floater-page-slug';
                slugInput.className = 'floater-input';
                slugInput.type = 'text';
                slugInput.value = page.slug || '';

                const submit = document.createElement('button');
                submit.type = 'button';
                submit.className = 'floater-button';
                submit.dataset.click = 'change-page-properties';
                submit.dataset.pageId = pageId;
                submit.textContent = 'Apply';

                wrapper.append(title, titleLabel, titleInput, slugLabel, slugInput, submit);
                return wrapper;
            },
            tooltip(pageItem) {
                const site = runtime.site;
                if (!site) {
                    return null;
                }

                const pageId = pageItem.dataset.pageId;
                const page = site.getPageData(pageId);
                if (!page) {
                    return null;
                }

                const wrapper = document.createElement('div');
                wrapper.className = 'floater-form';

                const title = document.createElement('div');
                title.className = 'floater-title';
                title.textContent = 'Page';

                const rowTitle = document.createElement('div');
                rowTitle.className = 'floater-breadcrumb';
                rowTitle.textContent = `Title: ${page.title || 'Untitled'}`;

                const rowSlug = document.createElement('div');
                rowSlug.className = 'floater-breadcrumb';
                rowSlug.textContent = `Slug: ${page.slug || 'no-slug'}`;

                wrapper.append(title, rowTitle, rowSlug);
                return wrapper;
            },
        });

        floater.addDisplay('node', {
            context(nodeElement) {
                const wrapper = document.createElement('div');
                wrapper.className = 'floater-form';

                const title = document.createElement('div');
                title.className = 'floater-title';
                title.textContent = 'Element';

                const crumb = document.createElement('div');
                crumb.className = 'floater-breadcrumb';
                crumb.textContent = buildBreadcrumbText(nodeElement);

                const nodeId = nodeElement.getAttribute('data-vs-node-id') || '';
                const deleteButton = document.createElement('button');
                deleteButton.type = 'button';
                deleteButton.className = 'floater-button';
                deleteButton.dataset.click = 'delete-node';
                deleteButton.dataset.nodeId = nodeId;
                deleteButton.dataset.confirmed = 'false';
                deleteButton.textContent = 'Delete';

                wrapper.append(title, crumb, deleteButton);
                return wrapper;
            },
            tooltip(nodeElement) {
                if (nodeElement.tagName.toLowerCase() === 'body') {
                    return null;
                }

                const wrapper = document.createElement('div');
                wrapper.className = 'floater-form';

                const title = document.createElement('div');
                title.className = 'floater-title';
                title.textContent = 'Element';

                const crumb = document.createElement('div');
                crumb.className = 'floater-breadcrumb';
                crumb.textContent = buildBreadcrumbText(nodeElement);

                wrapper.append(title, crumb);
                return wrapper;
            },
            delegate: false,
        });

        floater.addQuery('.page-item', { display: 'page-item' });
        syncFloaterNodeQueries();
    }

    function bindRuntimeEvents() {
        document.addEventListener('wc:pages-changed', function() {
            syncFloaterNodeQueries();
            wireFrameDnD();
        });

        document.addEventListener('wc:page-selected', function() {
            syncFloaterNodeQueries();
            wireFrameDnD();
        });

        document.addEventListener('wc:page-content-changed', function() {
            wireFrameDnD();
        });

        emit('wc:editor-ready', {
            pages: runtime.site ? runtime.site.listPages() : [],
            currentPageId: runtime.site ? runtime.site.getActiveID() : null,
        });
    }

    bootstrapEditor().catch(function(error) {
        console.error('[editor] Failed to initialize:', error);
        if (el.app) {
            el.app.textContent = `Failed to initialize editor: ${error.message}`;
        }
    });
})();
