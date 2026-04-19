(function() {
    const el = {
        app: document.querySelector('#app'),
        canvas: document.querySelector('#canvas'),
        previewFrame: document.querySelector('#preview-frame')
    };

    const projectJSON = {
        project: {},
        pages: {},
        stylesheets: {},
        scripts: {}
    };

    let currentPageId = null;
    let hoveredFrameElement = null;

    function emit(name, detail) {
        document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    }

    function slugify(input) {
        return String(input || 'new-page')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\/_-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^[-/]+|[-/]+$/g, '') || 'new-page';
    }

    function ensurePagesShape() {
        if (!projectJSON.pages || typeof projectJSON.pages !== 'object') {
            projectJSON.pages = {};
        }
        if (!projectJSON.pages.page_data || typeof projectJSON.pages.page_data !== 'object') {
            projectJSON.pages.page_data = {};
        }
        if (!Number.isInteger(projectJSON.pages.page_counter)) {
            projectJSON.pages.page_counter = 0;
        }
    }

    function getPageById(pageId) {
        ensurePagesShape();
        return projectJSON.pages.page_data[pageId] || null;
    }

    function listPages() {
        ensurePagesShape();

        return Object.entries(projectJSON.pages.page_data).map(function(entry) {
            const pageId = entry[0];
            const page = entry[1] || {};
            return {
                id: pageId,
                title: page.title || '(untitled)',
                slug: page.slug || ''
            };
        });
    }

    function buildNodeTree(doc, nodes, nodeId) {
        const node = nodes[nodeId];
        if (!node) {
            return null;
        }

        const isBodyRoot = node.tag === 'body' && node.parent === null;
        const element = isBodyRoot ? doc.body : doc.createElement(node.tag || 'div');

        const attrs = node.attrs || {};
        Object.keys(attrs).forEach(function(attrName) {
            if (attrName.startsWith('_')) {
                return;
            }
            element.setAttribute(attrName, attrs[attrName]);
        });

        element.setAttribute('data-wc-node-id', nodeId);

        const children = node.children || [];
        children.forEach(function(childId) {
            const childEl = buildNodeTree(doc, nodes, childId);
            if (childEl && childEl !== doc.body) {
                element.appendChild(childEl);
            }
        });

        if (children.length === 0 && node.text) {
            element.textContent = node.text;
        }

        return element;
    }

    function injectEditorRuntimeStyles(frameDoc) {
        const existing = frameDoc.getElementById('wc-editor-runtime-style');
        if (existing) {
            return;
        }

        const styleEl = frameDoc.createElement('style');
        styleEl.id = 'wc-editor-runtime-style';
        styleEl.textContent = '.wc-hover-outline { outline: 2px solid #ff3b3b !important; outline-offset: -1px; }';
        frameDoc.head.appendChild(styleEl);
    }

    function clearFrameHoverOutline() {
        if (hoveredFrameElement) {
            hoveredFrameElement.classList.remove('wc-hover-outline');
            hoveredFrameElement = null;
        }
    }

    function setFrameHoverOutline(target) {
        if (!target || target.nodeType !== 1) {
            return;
        }

        const tagName = target.tagName ? target.tagName.toLowerCase() : '';
        if (tagName === 'html' || tagName === 'body') {
            clearFrameHoverOutline();
            return;
        }

        if (hoveredFrameElement === target) {
            return;
        }

        clearFrameHoverOutline();
        hoveredFrameElement = target;
        hoveredFrameElement.classList.add('wc-hover-outline');
    }

    function bindFrameEditorInteractions(frameDoc) {
        if (!frameDoc || frameDoc.__wcEditorInteractionsBound) {
            return;
        }

        frameDoc.__wcEditorInteractionsBound = true;

        frameDoc.addEventListener('mouseover', function(event) {
            setFrameHoverOutline(event.target);
        });

        frameDoc.addEventListener('mouseleave', function() {
            clearFrameHoverOutline();
        });
    }

    function deleteNodeSubtree(nodes, nodeId) {
        const node = nodes[nodeId];
        if (!node) {
            return;
        }

        const children = Array.isArray(node.children) ? node.children.slice() : [];
        children.forEach(function(childId) {
            deleteNodeSubtree(nodes, childId);
        });

        delete nodes[nodeId];
    }

    function renderPageToCanvas(pageId) {
        const page = getPageById(pageId);
        if (!page || !el.previewFrame) {
            return;
        }

        const frameDoc = el.previewFrame.contentDocument;
        if (!frameDoc) {
            return;
        }

        frameDoc.open();
        frameDoc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
        frameDoc.close();

        const nodes = page.nodes || {};
        const nodeStartId = page.node_start;
        if (!nodeStartId || !nodes[nodeStartId]) {
            return;
        }

        const bodyNode = nodes[nodeStartId];
        const bodyAttrs = (bodyNode && bodyNode.attrs) || {};
        Object.keys(bodyAttrs).forEach(function(attrName) {
            if (attrName.startsWith('_')) {
                return;
            }
            frameDoc.body.setAttribute(attrName, bodyAttrs[attrName]);
        });
        frameDoc.body.setAttribute('data-wc-node-id', nodeStartId);

        const bodyChildren = bodyNode.children || [];
        bodyChildren.forEach(function(childId) {
            const childEl = buildNodeTree(frameDoc, nodes, childId);
            if (childEl && childEl !== frameDoc.body) {
                frameDoc.body.appendChild(childEl);
            }
        });

        if (bodyChildren.length === 0 && bodyNode.text) {
            frameDoc.body.textContent = bodyNode.text;
        }

        const pageIncludes = page.include || {};
        const cssList = pageIncludes.css || [];
        const jsList = pageIncludes.js || [];

        cssList.forEach(function(cssName) {
            const cssContent = projectJSON.stylesheets[cssName];
            if (typeof cssContent !== 'string') {
                return;
            }
            const styleEl = frameDoc.createElement('style');
            styleEl.setAttribute('data-asset', cssName);
            styleEl.textContent = cssContent;
            frameDoc.head.appendChild(styleEl);
        });

        jsList.forEach(function(jsName) {
            const jsContent = projectJSON.scripts[jsName];
            if (typeof jsContent !== 'string') {
                return;
            }
            const scriptEl = frameDoc.createElement('script');
            scriptEl.setAttribute('data-asset', jsName);
            scriptEl.textContent = jsContent;
            frameDoc.body.appendChild(scriptEl);
        });

        if (page.title) {
            frameDoc.title = page.title;
        }

        injectEditorRuntimeStyles(frameDoc);
        bindFrameEditorInteractions(frameDoc);
        emit('wc:frame-rendered', { pageId: pageId, frameDocument: frameDoc });
    }

    function setCurrentPage(pageId) {
        if (!getPageById(pageId)) {
            return { ok: false, message: 'Page not found.' };
        }

        currentPageId = pageId;
        projectJSON.pages.page_start = pageId;
        renderPageToCanvas(pageId);
        emit('wc:page-selected', { pageId: pageId });
        emit('wc:pages-changed', { pages: listPages(), currentPageId: currentPageId });

        return { ok: true, pageId: pageId };
    }

    function createPage(titleInput, slugInput) {
        ensurePagesShape();

        const title = String(titleInput || 'New Page').trim() || 'New Page';
        const slug = slugify(slugInput || title);

        let nextCounter = Number(projectJSON.pages.page_counter) || 0;
        let pageId = 'p' + nextCounter;

        while (projectJSON.pages.page_data[pageId]) {
            nextCounter += 1;
            pageId = 'p' + nextCounter;
        }

        projectJSON.pages.page_data[pageId] = {
            title: title,
            slug: slug,
            node_start: 'n0',
            node_counter: 1,
            nodes: {
                n0: {
                    tag: 'body',
                    parent: null,
                    children: []
                }
            },
            include: {
                css: [],
                js: []
            }
        };

        projectJSON.pages.page_counter = nextCounter + 1;
        if (!projectJSON.pages.page_start) {
            projectJSON.pages.page_start = pageId;
        }

        setCurrentPage(pageId);
        return { ok: true, pageId: pageId };
    }

    function deletePage(pageId) {
        ensurePagesShape();

        if (!projectJSON.pages.page_data[pageId]) {
            return { ok: false, message: 'Page not found.' };
        }

        const pageIds = Object.keys(projectJSON.pages.page_data);
        if (pageIds.length <= 1) {
            return { ok: false, message: 'At least one page must remain.' };
        }

        delete projectJSON.pages.page_data[pageId];

        if (projectJSON.pages.page_start === pageId) {
            projectJSON.pages.page_start = Object.keys(projectJSON.pages.page_data)[0] || null;
        }

        if (currentPageId === pageId) {
            currentPageId = projectJSON.pages.page_start;
            if (currentPageId) {
                renderPageToCanvas(currentPageId);
            } else {
                if (el.previewFrame && el.previewFrame.contentDocument) {
                    const frameDoc = el.previewFrame.contentDocument;
                    frameDoc.open();
                    frameDoc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
                    frameDoc.close();
                }
            }
        }

        emit('wc:pages-changed', { pages: listPages(), currentPageId: currentPageId });
        return { ok: true };
    }

    function updatePageProperties(pageId, updates) {
        const page = getPageById(pageId);
        if (!page) {
            return { ok: false, message: 'Page not found.' };
        }

        const nextTitle = String((updates && updates.title) || page.title || '').trim();
        const nextSlug = slugify((updates && updates.slug) || page.slug || nextTitle || 'new-page');

        if (!nextTitle) {
            return { ok: false, message: 'Title is required.' };
        }

        page.title = nextTitle;
        page.slug = nextSlug;

        emit('wc:pages-changed', { pages: listPages(), currentPageId: currentPageId });
        return { ok: true };
    }

    function deleteNode(nodeId) {
        const page = getPageById(currentPageId);
        if (!page) {
            return { ok: false, message: 'No active page.' };
        }

        const nodes = page.nodes || {};
        const targetNode = nodes[nodeId];
        if (!targetNode) {
            return { ok: false, message: 'Element not found.' };
        }

        if (targetNode.parent === null) {
            return { ok: false, message: 'Cannot delete body root.' };
        }

        const parentNode = nodes[targetNode.parent];
        if (parentNode && Array.isArray(parentNode.children)) {
            parentNode.children = parentNode.children.filter(function(childId) {
                return childId !== nodeId;
            });
        }

        deleteNodeSubtree(nodes, nodeId);
        renderPageToCanvas(currentPageId);
        emit('wc:page-content-changed', { pageId: currentPageId });

        return { ok: true };
    }

    function loadProject(data) {
        projectJSON.project = data.project || {};
        projectJSON.pages = data.pages || {};
        projectJSON.stylesheets = data.stylesheets || {};
        projectJSON.scripts = data.scripts || {};

        ensurePagesShape();

        currentPageId = projectJSON.pages.page_start;
        if (!currentPageId || !projectJSON.pages.page_data[currentPageId]) {
            currentPageId = Object.keys(projectJSON.pages.page_data)[0] || null;
            projectJSON.pages.page_start = currentPageId;
        }

        if (currentPageId) {
            renderPageToCanvas(currentPageId);
        }

        emit('wc:project-ready', { pages: listPages(), currentPageId: currentPageId });
        emit('wc:pages-changed', { pages: listPages(), currentPageId: currentPageId });
    }

    window.WebConstruct = {
        getProjectJSON: function() {
            return projectJSON;
        },
        getPages: listPages,
        getPage: getPageById,
        getCurrentPageId: function() {
            return currentPageId;
        },
        setCurrentPage: setCurrentPage,
        createPage: createPage,
        deletePage: deletePage,
        updatePageProperties: updatePageProperties,
        deleteNode: deleteNode
    };

    const initialProject = window.webConstructInitialProject;
    const initialProjectUrl = window.webConstructInitialProjectUrl || '/jsons/example.json';

    if (initialProject && typeof initialProject === 'object') {
        loadProject(initialProject);
    } else {
        fetch(initialProjectUrl)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                loadProject(data);
            })
            .catch(function(error) {
                console.error('Error fetching project configuration:', error);
                if (el.app) {
                    el.app.textContent = 'Failed to load builder project: ' + error.message;
                }
            });
    }




})();


(function() {

    const appEl = document.querySelector('#app');

    const builderAssets = {
        elements: [],
        css: []
    };

    function renderAssets(assets) {
        builderAssets.elements = assets.elements || [];
        builderAssets.css = assets.css || [];
    }

    const assetsUrl = window.webConstructAssetsUrl || '/jsons/assets.json';

    fetch(assetsUrl)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response.json();
        })
        .then(function(assets) {
            renderAssets(assets);
        })
        .catch(function(error) {
            console.error('Error fetching assets:', error);
            if (appEl) {
                appEl.textContent = 'Failed to load assets catalog: ' + error.message;
            }
        });

})();