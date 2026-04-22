(function() {
    const app = document.querySelector('#app');
    const canvas = document.querySelector('#canvas');

    const state = {
        site: null,
        floater: null,
        nodeQueries: new Set(),
        frameKeys: new Set(),
    };

    const DND_TYPE_TEMPLATE = 'application/x-ezvs-template';
    const DND_TYPE_NODE_ID = 'application/x-ezvs-node-id';

    function dispatch(name, detail) {
        document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    }

    function site() {
        return state.site;
    }

    function getInitialProject() {
        if (window.webConstructInitialProject && typeof window.webConstructInitialProject === 'object') {
            return Promise.resolve(window.webConstructInitialProject);
        }

        const initialProjectUrl = window.webConstructInitialProjectUrl || '/jsons/example.json';
        return fetch(initialProjectUrl).then(function(response) {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        });
    }

    function appendLine(parent, className, text) {
        const element = document.createElement('div');
        element.className = className;
        element.textContent = text;
        parent.appendChild(element);
        return element;
    }

    function buildBreadcrumb(element) {
        const tags = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
            tags.push(current.tagName.toLowerCase());
            if (current.tagName.toLowerCase() === 'body') {
                break;
            }
            current = current.parentElement;
        }

        return tags.reverse().join(' > ');
    }

    function pageNodeQuery(pageId) {
        return typeof pageId === 'string' && pageId.trim()
            ? `@ez-virtualsite-${pageId} [data-vs-node-id]`
            : null;
    }

    function syncFloaterNodeQueries() {
        if (!state.floater || !site()) {
            return;
        }

        const nextQueries = new Set(
            site().listPages()
                .map(function(page) { return pageNodeQuery(page.id); })
                .filter(Boolean)
        );

        state.nodeQueries.forEach(function(query) {
            if (!nextQueries.has(query)) {
                state.floater.removeQuery(query);
            }
        });

        nextQueries.forEach(function(query) {
            if (!state.nodeQueries.has(query)) {
                state.floater.addQuery(query, { display: 'node' });
            }
        });

        state.nodeQueries = nextQueries;
    }

    function normalizeTemplate(payload) {
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

    function addNodeTree(node, parentId) {
        const currentSite = site();
        if (!currentSite || !node || typeof node !== 'object') {
            return null;
        }

        const nodeId = currentSite.addNode({
            tag: node.tag || 'div',
            parent: parentId || null,
            attrs: node.attrs && typeof node.attrs === 'object' ? node.attrs : undefined,
            text: typeof node.text === 'string' ? node.text : undefined,
            graph: node.graph || null,
        });

        if (!nodeId) {
            return null;
        }

        (Array.isArray(node.children) ? node.children : []).forEach(function(child) {
            addNodeTree(child, nodeId);
        });

        return nodeId;
    }

    function eventNodeElement(event) {
        return event && event.target && event.target.closest
            ? event.target.closest('[data-vs-node-id]')
            : null;
    }

    function clearDropTargetState(doc) {
        if (!doc || !doc.querySelectorAll) {
            return;
        }

        doc.querySelectorAll('[data-vs-drop-target="true"]').forEach(function(element) {
            element.removeAttribute('data-vs-drop-target');
        });
    }

    function setDropTarget(event, isActive) {
        const nodeElement = eventNodeElement(event);
        if (!nodeElement) {
            return;
        }

        if (isActive) {
            nodeElement.setAttribute('data-vs-drop-target', 'true');
        } else {
            nodeElement.removeAttribute('data-vs-drop-target');
        }
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
        const nodeElement = eventNodeElement(event);
        if (!event || !event.dataTransfer || !nodeElement) {
            return;
        }

        const nodeId = nodeElement.getAttribute('data-vs-node-id');
        if (!nodeId) {
            return;
        }

        event.dataTransfer.setData(DND_TYPE_NODE_ID, nodeId);
        event.dataTransfer.effectAllowed = 'move';
    }

    function handleFrameDragOver(event) {
        if (!event || !event.dataTransfer) {
            return;
        }

        const types = event.dataTransfer.types || [];
        const hasTemplate = types.includes(DND_TYPE_TEMPLATE);
        const hasNode = types.includes(DND_TYPE_NODE_ID);
        if (!hasTemplate && !hasNode) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = hasTemplate ? 'copy' : 'move';
        setDropTarget(event, true);
    }

    function handleFrameDragLeave(event) {
        setDropTarget(event, false);
    }

    function handleFrameDragEnd(event) {
        clearDropTargetState(event && event.view ? event.view.document : null);
    }

    function handleFrameDrop(event) {
        const currentSite = site();
        if (!currentSite || !event || !event.dataTransfer) {
            return;
        }

        event.preventDefault();

        const nodeElement = eventNodeElement(event);
        const parentId = nodeElement ? (nodeElement.getAttribute('data-vs-node-id') || null) : null;
        const templateJSON = event.dataTransfer.getData(DND_TYPE_TEMPLATE);
        const draggedNodeId = event.dataTransfer.getData(DND_TYPE_NODE_ID);

        if (templateJSON) {
            try {
                const template = normalizeTemplate(JSON.parse(templateJSON));
                if (template) {
                    addNodeTree(template, parentId);
                }
            } catch (_) {
                // Ignore invalid template payloads.
            }
        } else if (draggedNodeId && draggedNodeId !== parentId) {
            currentSite.reparentNode(draggedNodeId, parentId || null);
        }

        clearDropTargetState(event.view && event.view.document ? event.view.document : null);
    }

    function wireFrameDnD() {
        const currentSite = site();
        if (!currentSite) {
            return;
        }

        const nextKeys = new Set();

        currentSite.listPages().forEach(function(page) {
            const frame = currentSite.getPageFrame(page.id);
            const doc = frame ? frame.contentDocument : null;
            if (!doc) {
                return;
            }

            nextKeys.add(page.id);

            if (!state.frameKeys.has(page.id)) {
                doc.addEventListener('dragstart', handleFrameDragStart);
                doc.addEventListener('dragover', handleFrameDragOver);
                doc.addEventListener('dragleave', handleFrameDragLeave);
                doc.addEventListener('dragend', handleFrameDragEnd);
                doc.addEventListener('drop', handleFrameDrop);
            }

            ensureNodesDraggable(doc);
        });

        state.frameKeys = nextKeys;
    }

    function buildPageContext(pageId, pageData) {
        const wrapper = document.createElement('div');
        wrapper.className = 'floater-form';
        wrapper.dataset.pageId = pageId;

        appendLine(wrapper, 'floater-title', 'Edit Page');

        const titleLabel = document.createElement('label');
        titleLabel.className = 'floater-label';
        titleLabel.htmlFor = 'floater-page-title';
        titleLabel.textContent = 'Title';

        const titleInput = document.createElement('input');
        titleInput.id = 'floater-page-title';
        titleInput.className = 'floater-input';
        titleInput.type = 'text';
        titleInput.value = pageData.title || '';

        const slugLabel = document.createElement('label');
        slugLabel.className = 'floater-label';
        slugLabel.htmlFor = 'floater-page-slug';
        slugLabel.textContent = 'Slug';

        const slugInput = document.createElement('input');
        slugInput.id = 'floater-page-slug';
        slugInput.className = 'floater-input';
        slugInput.type = 'text';
        slugInput.value = pageData.slug || '';

        const submit = document.createElement('button');
        submit.type = 'button';
        submit.className = 'floater-button';
        submit.dataset.click = 'change-page-properties';
        submit.dataset.pageId = pageId;
        submit.textContent = 'Apply';

        const include = pageData.include && typeof pageData.include === 'object' ? pageData.include : { css: [], js: [] };
        const cssTags = Array.isArray(include.css) ? include.css : [];
        const jsTags = Array.isArray(include.js) ? include.js : [];

        const includeLabelCss = document.createElement('div');
        includeLabelCss.className = 'floater-label';
        includeLabelCss.textContent = 'Include CSS';

        const cssTagList = document.createElement('div');
        cssTagList.className = 'floater-tag-list';
        cssTagList.dataset.tagList = 'css';

        cssTags.forEach(function(name) {
            const tag = document.createElement('button');
            tag.type = 'button';
            tag.className = 'floater-chip';
            tag.dataset.click = 'remove-page-include';
            tag.dataset.includeType = 'css';
            tag.dataset.includeName = name;
            tag.dataset.pageId = pageId;
            tag.textContent = `${name} x`;
            cssTagList.appendChild(tag);
        });

        const addCss = document.createElement('button');
        addCss.type = 'button';
        addCss.className = 'floater-chip floater-chip-add';
        addCss.dataset.click = 'toggle-page-include-picker';
        addCss.dataset.includeType = 'css';
        addCss.dataset.pageId = pageId;
        addCss.textContent = '+ css';
        cssTagList.appendChild(addCss);

        const includeLabelJs = document.createElement('div');
        includeLabelJs.className = 'floater-label';
        includeLabelJs.textContent = 'Include JS';

        const jsTagList = document.createElement('div');
        jsTagList.className = 'floater-tag-list';
        jsTagList.dataset.tagList = 'js';

        jsTags.forEach(function(name) {
            const tag = document.createElement('button');
            tag.type = 'button';
            tag.className = 'floater-chip';
            tag.dataset.click = 'remove-page-include';
            tag.dataset.includeType = 'js';
            tag.dataset.includeName = name;
            tag.dataset.pageId = pageId;
            tag.textContent = `${name} x`;
            jsTagList.appendChild(tag);
        });

        const addJs = document.createElement('button');
        addJs.type = 'button';
        addJs.className = 'floater-chip floater-chip-add';
        addJs.dataset.click = 'toggle-page-include-picker';
        addJs.dataset.includeType = 'js';
        addJs.dataset.pageId = pageId;
        addJs.textContent = '+ js';
        jsTagList.appendChild(addJs);

        const picker = document.createElement('div');
        picker.className = 'floater-include-picker';
        picker.dataset.includePicker = 'true';
        picker.hidden = true;

        wrapper.append(
            titleLabel,
            titleInput,
            slugLabel,
            slugInput,
            submit,
            includeLabelCss,
            cssTagList,
            includeLabelJs,
            jsTagList,
            picker
        );
        return wrapper;
    }

    function buildPageTooltip(pageData) {
        const wrapper = document.createElement('div');
        wrapper.className = 'floater-form';
        appendLine(wrapper, 'floater-title', 'Page');
        appendLine(wrapper, 'floater-breadcrumb', `Title: ${pageData.title || 'Untitled'}`);
        appendLine(wrapper, 'floater-breadcrumb', `Slug: ${pageData.slug || 'no-slug'}`);
        return wrapper;
    }

    function buildNodeFloater(nodeElement, includeDelete) {
        if (!nodeElement) {
            return null;
        }

        if (!includeDelete && nodeElement.tagName.toLowerCase() === 'body') {
            return null;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'floater-form';

        appendLine(wrapper, 'floater-title', 'Element');
        appendLine(wrapper, 'floater-breadcrumb', buildBreadcrumb(nodeElement));

        if (includeDelete) {
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'floater-button';
            deleteButton.dataset.click = 'delete-node';
            deleteButton.dataset.nodeId = nodeElement.getAttribute('data-vs-node-id') || '';
            deleteButton.dataset.confirmed = 'false';
            deleteButton.textContent = 'Delete';
            wrapper.appendChild(deleteButton);
        }

        return wrapper;
    }

    function setupFloater() {
        if (!window.EzFloater) {
            return;
        }

        const floater = new window.EzFloater();
        state.floater = floater;
        window.editorFloater = floater;

        floater.addAction('change-page-properties', function(button) {
            const currentSite = site();
            if (!currentSite) {
                return;
            }

            const titleInput = floater.floater.querySelector('#floater-page-title');
            const slugInput = floater.floater.querySelector('#floater-page-slug');
            const title = titleInput ? titleInput.value.trim() : '';
            const slug = slugInput ? slugInput.value.trim() : '';

            if (!title) {
                button.textContent = 'Title is required';
                return;
            }

            if (!currentSite.updatePage(button.dataset.pageId, { title: title, slug: slug })) {
                button.textContent = 'Page not found';
                return;
            }

            button.dataset.confirmed = 'false';
            button.classList.remove('danger');
            button.textContent = 'Delete';
            floater.hide();
        });

        floater.addAction('toggle-page-include-picker', function(button) {
            const currentSite = site();
            if (!currentSite) {
                return;
            }

            const pageId = button.dataset.pageId;
            const includeType = button.dataset.includeType;
            if (!pageId || (includeType !== 'css' && includeType !== 'js')) {
                return;
            }

            const menu = button.closest('.floater-form');
            const picker = menu ? menu.querySelector('[data-include-picker="true"]') : null;
            if (!picker) {
                return;
            }

            if (!picker.hidden && picker.dataset.includeType === includeType) {
                picker.hidden = true;
                picker.replaceChildren();
                return;
            }

            const pageIncludes = currentSite.getPageIncludes(pageId) || { css: [], js: [] };
            const included = new Set(Array.isArray(pageIncludes[includeType]) ? pageIncludes[includeType] : []);
            const allNames = includeType === 'css'
                ? (typeof currentSite.listStylesheets === 'function' ? currentSite.listStylesheets() : Object.keys((currentSite.getDataJSON() || {}).stylesheets || {}))
                : Object.keys((currentSite.getDataJSON() || {}).scripts || {});

            picker.hidden = false;
            picker.dataset.includeType = includeType;
            picker.dataset.pageId = pageId;
            picker.replaceChildren();

            const title = document.createElement('div');
            title.className = 'floater-picker-title';
            title.textContent = includeType === 'css' ? 'Pick stylesheet' : 'Pick script';
            picker.appendChild(title);

            const options = allNames.filter(function(name) { return !included.has(name); });
            if (!options.length) {
                const empty = document.createElement('div');
                empty.className = 'floater-picker-empty';
                empty.textContent = 'Nothing to add';
                picker.appendChild(empty);
                return;
            }

            options.forEach(function(name) {
                const option = document.createElement('button');
                option.type = 'button';
                option.className = 'floater-picker-option';
                option.dataset.click = 'add-page-include';
                option.dataset.pageId = pageId;
                option.dataset.includeType = includeType;
                option.dataset.includeName = name;
                option.textContent = name;
                picker.appendChild(option);
            });
        });

        floater.addAction('add-page-include', function(button) {
            const currentSite = site();
            if (!currentSite) {
                return;
            }

            const pageId = button.dataset.pageId;
            const includeType = button.dataset.includeType;
            const includeName = button.dataset.includeName;
            if (!pageId || !includeName) {
                return;
            }

            currentSite.addPageInclude(includeType, includeName, pageId);

            const pageData = currentSite.getPageData(pageId);
            const menu = button.closest('.floater-form');
            if (menu && pageData) {
                const next = buildPageContext(pageId, pageData);
                menu.replaceWith(next);
            }
        });

        floater.addAction('remove-page-include', function(button) {
            const currentSite = site();
            if (!currentSite) {
                return;
            }

            const pageId = button.dataset.pageId;
            const includeType = button.dataset.includeType;
            const includeName = button.dataset.includeName;
            if (!pageId || !includeName) {
                return;
            }

            currentSite.removePageInclude(includeType, includeName, pageId);

            const pageData = currentSite.getPageData(pageId);
            const menu = button.closest('.floater-form');
            if (menu && pageData) {
                const next = buildPageContext(pageId, pageData);
                menu.replaceWith(next);
            }
        });

        floater.addAction('delete-node', function(button) {
            const currentSite = site();
            if (!currentSite) {
                return;
            }

            if (button.dataset.confirmed !== 'true') {
                button.dataset.confirmed = 'true';
                button.classList.add('danger');
                button.textContent = 'Are you sure?';
                return;
            }

            if (!currentSite.deleteNode(button.dataset.nodeId)) {
                button.textContent = 'Delete failed';
                return;
            }

            floater.hide();
        });

        floater.addDisplay('page-item', {
            context(pageItem) {
                const currentSite = site();
                if (!currentSite) {
                    return 'Page API unavailable.';
                }

                const pageId = pageItem.dataset.pageId;
                const pageData = currentSite.getPageData(pageId);
                return pageData ? buildPageContext(pageId, pageData) : 'Page not found.';
            },
            tooltip(pageItem) {
                const currentSite = site();
                if (!currentSite) {
                    return null;
                }

                const pageData = currentSite.getPageData(pageItem.dataset.pageId);
                return pageData ? buildPageTooltip(pageData) : null;
            },
        });

        floater.addDisplay('node', {
            context(nodeElement) {
                return buildNodeFloater(nodeElement, true);
            },
            tooltip(nodeElement) {
                return buildNodeFloater(nodeElement, false);
            },
            delegate: false,
        });

        floater.addQuery('.page-item', { display: 'page-item' });
        syncFloaterNodeQueries();
    }

    function bindRuntimeEvents() {
        ['wc:pages-changed', 'wc:page-selected'].forEach(function(eventName) {
            document.addEventListener(eventName, function() {
                syncFloaterNodeQueries();
                wireFrameDnD();
            });
        });

        document.addEventListener('wc:page-content-changed', wireFrameDnD);

        dispatch('wc:editor-ready', {
            pages: site() ? site().listPages() : [],
            currentPageId: site() ? site().getActiveID() : null,
        });
    }

    async function bootstrapEditor() {
        if (!window.EzVirtualSite) {
            throw new Error('EzVirtualSite is not loaded.');
        }

        if (!canvas) {
            throw new Error('Editor canvas host not found.');
        }

        const currentSite = new window.EzVirtualSite();
        const data = await getInitialProject();

        state.site = currentSite;
        window.vsite = currentSite;

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

        currentSite
            .setGlobalStyle(globalStyle)
            .setHost(canvas)
            .setData(data)
            .init();

        setupFloater();
        wireFrameDnD();
        bindRuntimeEvents();

        if (app) {
            app.setAttribute('data-editor-ready', 'true');
        }
    }

    bootstrapEditor().catch(function(error) {
        console.error('[editor] Failed to initialize:', error);
        if (app) {
            app.textContent = `Failed to initialize editor: ${error.message}`;
        }
    });
})();
