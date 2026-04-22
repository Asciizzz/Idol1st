(function() {
    const sidebarButtons = document.querySelector('#sidebar-buttons');
    const sidebarContent = document.querySelector('#sidebar-content');

    if (!sidebarButtons || !sidebarContent) {
        return;
    }

    let activeButton = null;
    let activeSection = null;
    let viewFloaterReady = false;
    const styleState = {
        activeName: null,
        saveTimer: null,
    };

    const viewMenuTimers = new WeakMap();

    function esc(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function vsite() {
        return window.vsite || null;
    }

    function renderPlaceholder(panelBody, text) {
        panelBody.replaceChildren();
        const placeholder = document.createElement('div');
        placeholder.className = 'panel-placeholder';
        placeholder.textContent = text;
        panelBody.appendChild(placeholder);
    }

    function activeViewPanelBody() {
        if (activeSection !== 'view' || !sidebarContent.classList.contains('is-open')) {
            return null;
        }

        return sidebarContent.querySelector('.sidebar-panel-body[data-section="view"]');
    }

    function rerenderViewPanel() {
        const panelBody = activeViewPanelBody();
        if (panelBody) {
            renderViewTree(panelBody);
        }
    }

    function nodeById(nodeId) {
        const site = vsite();
        if (!site || !nodeId || typeof site.readNode !== 'function') {
            return null;
        }

        const node = site.readNode(nodeId);
        if (!node) {
            return null;
        }

        return {
            tag: node.tag || 'div',
            parent: node.parent,
            children: Array.isArray(node.children) ? node.children : [],
            text: typeof node.text === 'string' ? node.text : '',
            attrs: node.attrs && typeof node.attrs === 'object' ? node.attrs : {},
            graph: node.graph || null,
        };
    }

    function attrsToRows(attrs) {
        return Object.entries(attrs || {}).map(function(entry) {
            return { key: String(entry[0]), value: String(entry[1]) };
        });
    }

    function collectMenuAttrs(menu) {
        const attrs = {};

        menu.querySelectorAll('.view-floater-attr-edit-row').forEach(function(row) {
            const inputs = row.querySelectorAll('.view-floater-input');
            if (inputs.length < 2) {
                return;
            }

            const key = (inputs[0].value || '').trim();
            const value = (inputs[1].value || '').trim();
            if (!key || !value) {
                return;
            }

            attrs[key] = value;
        });

        return attrs;
    }

    function syncViewMenu(menu) {
        const site = vsite();
        if (!site || typeof site.writeNode !== 'function' || !menu) {
            return;
        }

        const nodeId = menu.dataset.nodeId;
        const textInput = menu.querySelector('.view-floater-text-input');

        site.writeNode(nodeId, {
            text: textInput ? textInput.value : '',
            attrs: collectMenuAttrs(menu),
        });

        rerenderViewPanel();
    }

    function queueViewMenuSync(menu) {
        if (!menu) {
            return;
        }

        const currentTimer = viewMenuTimers.get(menu);
        if (currentTimer) {
            clearTimeout(currentTimer);
        }

        const timer = setTimeout(function() {
            syncViewMenu(menu);
            viewMenuTimers.delete(menu);
        }, 180);

        viewMenuTimers.set(menu, timer);
    }

    function createAttrInputRow(attr, onChange) {
        const row = document.createElement('div');
        row.className = 'view-floater-attr-edit-row';

        const key = document.createElement('input');
        key.type = 'text';
        key.className = 'view-floater-input';
        key.placeholder = 'attribute';
        key.value = attr && typeof attr.key === 'string' ? attr.key : '';

        const value = document.createElement('input');
        value.type = 'text';
        value.className = 'view-floater-input';
        value.placeholder = 'value';
        value.value = attr && typeof attr.value === 'string' ? attr.value : '';

        if (typeof onChange === 'function') {
            key.addEventListener('input', onChange);
            value.addEventListener('input', onChange);
        }

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'view-floater-button danger';
        remove.dataset.click = 'remove-view-attr';
        remove.textContent = 'x';

        row.append(key, value, remove);
        return row;
    }

    function getViewFloater() {
        return window.editorFloater || null;
    }

    function buildViewFloater(node, mode) {
        if (!node) {
            return null;
        }

        const wrapper = document.createElement('div');
        wrapper.className = mode === 'context' ? 'view-floater-menu' : 'view-floater-tooltip';

        const header = document.createElement('div');
        header.className = 'view-floater-header';

        const tag = document.createElement('div');
        tag.className = 'view-floater-tag';
        tag.textContent = String(node.tag || 'div').toLowerCase();

        const children = document.createElement('div');
        children.className = 'view-floater-children-count';
        children.textContent = `children: ${node.children.length}`;

        header.append(tag, children);
        wrapper.appendChild(header);

        const text = document.createElement('div');
        const trimmedText = (node.text || '').trim();
        text.className = 'view-floater-text' + (trimmedText ? '' : ' is-empty');
        text.textContent = trimmedText || '<empty>';
        wrapper.appendChild(text);

        const attrsBlock = document.createElement('div');
        attrsBlock.className = 'view-floater-attrs';

        const attrsLabel = document.createElement('div');
        attrsLabel.className = 'view-floater-label';
        attrsLabel.textContent = 'attributes';
        attrsBlock.appendChild(attrsLabel);

        attrsToRows(node.attrs).forEach(function(row) {
            const line = document.createElement('div');
            line.className = 'view-floater-attr-row';

            const key = document.createElement('span');
            key.textContent = row.key;

            const value = document.createElement('span');
            value.textContent = row.value;

            line.append(key, value);
            attrsBlock.appendChild(line);
        });

        wrapper.appendChild(attrsBlock);

        if (mode === 'context') {
            const scheduleSync = function(event) {
                const menu = event && event.target ? event.target.closest('.view-floater-menu') : null;
                queueViewMenuSync(menu);
            };

            const textLabel = document.createElement('div');
            textLabel.className = 'view-floater-label';
            textLabel.textContent = 'Text Content';

            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'view-floater-input view-floater-text-input';
            textInput.value = node.text;
            textInput.addEventListener('input', scheduleSync);

            const attrsEditorLabel = document.createElement('div');
            attrsEditorLabel.className = 'view-floater-label';
            attrsEditorLabel.textContent = 'Attributes';

            const attrsList = document.createElement('div');
            attrsList.className = 'view-floater-attr-list';
            attrsList.dataset.attrList = 'true';

            attrsToRows(node.attrs).forEach(function(row) {
                attrsList.appendChild(createAttrInputRow(row, scheduleSync));
            });

            const addAttrButton = document.createElement('button');
            addAttrButton.type = 'button';
            addAttrButton.className = 'view-floater-button';
            addAttrButton.dataset.click = 'add-view-attr';
            addAttrButton.textContent = '+ Add Attribute';

            const actions = document.createElement('div');
            actions.className = 'view-floater-actions';

            wrapper.append(textLabel, textInput, attrsEditorLabel, attrsList, addAttrButton, actions);
        }

        return wrapper;
    }

    function setupViewFloater() {
        const floater = getViewFloater();
        if (!floater || viewFloaterReady) {
            return;
        }

        floater.addAction('add-view-attr', function(button) {
            const menu = button.closest('.view-floater-menu');
            const list = menu ? menu.querySelector('[data-attr-list="true"]') : null;
            if (!list) {
                return;
            }

            const scheduleSync = function(event) {
                const currentMenu = event && event.target ? event.target.closest('.view-floater-menu') : menu;
                queueViewMenuSync(currentMenu);
            };

            list.appendChild(createAttrInputRow({ key: '', value: '' }, scheduleSync));
        });

        floater.addAction('remove-view-attr', function(button) {
            const menu = button.closest('.view-floater-menu');
            const row = button.closest('.view-floater-attr-edit-row');
            if (row) {
                row.remove();
                syncViewMenu(menu);
            }
        });

        floater.addDisplay('view-node', {
            tooltip(element) {
                const node = nodeById(element && element.getAttribute ? element.getAttribute('data-node-id') : null);
                return buildViewFloater(node, 'tooltip');
            },
            context(element) {
                const nodeId = element && element.getAttribute ? element.getAttribute('data-node-id') : null;
                const node = nodeById(nodeId);
                const content = buildViewFloater(node, 'context');
                if (content) {
                    content.dataset.nodeId = nodeId || '';
                }
                return content;
            },
        });

        floater.addQuery('.view-node-card[data-node-id]', { display: 'view-node' });
        viewFloaterReady = true;
    }

    function hideViewTooltip() {
        const floater = getViewFloater();
        if (floater && floater.state && floater.state.mode === 'tooltip') {
            floater.hide();
        }
    }

    function closeViewContextMenu() {
        const floater = getViewFloater();
        if (floater && floater.state && floater.state.mode === 'context') {
            floater.hide();
        }
    }

    function renderViewTree(panelBody) {
        const site = vsite();
        const page = site ? site.getPageData() : null;
        const nodes = page && page.nodes && typeof page.nodes === 'object' ? page.nodes : null;

        if (!nodes) {
            panelBody.replaceChildren();
            return;
        }

        const childrenMap = new Map();

        Object.entries(nodes).forEach(function(entry) {
            const nodeId = entry[0];
            const node = entry[1];
            const parentId = typeof node.parent === 'string' && node.parent && nodes[node.parent] ? node.parent : null;

            if (!childrenMap.has(parentId)) {
                childrenMap.set(parentId, []);
            }

            childrenMap.get(parentId).push(nodeId);
        });

        const root = document.createElement('div');
        root.className = 'view-tree-root';
        root.dataset.dropParentId = '';
        root.textContent = 'Page Root';

        const tree = document.createElement('div');
        tree.className = 'view-tree';

        const seen = new Set();

        function buildNode(nodeId) {
            if (seen.has(nodeId)) {
                return null;
            }

            seen.add(nodeId);
            const node = nodes[nodeId];
            if (!node) {
                return null;
            }

            const item = document.createElement('div');
            item.className = 'view-node-item';

            const card = document.createElement('div');
            card.className = 'view-node-card';
            card.draggable = true;
            card.dataset.nodeId = nodeId;
            card.dataset.dropParentId = nodeId;

            const head = document.createElement('div');
            head.className = 'view-node-head';

            const tag = document.createElement('div');
            tag.className = 'view-node-tag';
            tag.textContent = String(node.tag || 'div').toLowerCase();

            const meta = document.createElement('div');
            meta.className = 'view-node-meta';
            meta.textContent = `children: ${Array.isArray(node.children) ? node.children.length : 0}`;

            head.append(tag, meta);

            const text = document.createElement('div');
            const rawText = typeof node.text === 'string' ? node.text : '';
            text.className = 'view-node-text' + (rawText.trim() ? '' : ' is-empty');
            text.textContent = rawText.trim() ? rawText : '<empty>';

            card.append(head, text);

            const childrenWrap = document.createElement('div');
            childrenWrap.className = 'view-node-children';

            (childrenMap.get(nodeId) || []).forEach(function(childId) {
                const child = buildNode(childId);
                if (child) {
                    childrenWrap.appendChild(child);
                }
            });

            item.append(card, childrenWrap);
            return item;
        }

        (childrenMap.get(null) || []).forEach(function(rootId) {
            const node = buildNode(rootId);
            if (node) {
                tree.appendChild(node);
            }
        });

        panelBody.replaceChildren(root, tree);
    }

    function clearTreeDropTargets() {
        sidebarContent.querySelectorAll('.is-drag-over').forEach(function(element) {
            element.classList.remove('is-drag-over');
        });
    }

    function renderPagesPanel(panelBody) {
        const site = vsite();
        if (!site) {
            panelBody.replaceChildren();
            return;
        }

        const pages = site.listPages();
        const currentPageId = site.getActiveID();

        panelBody.replaceChildren();

        const actions = document.createElement('div');
        actions.className = 'pages-actions';
        actions.innerHTML = '<button class="pages-create-button" type="button" data-action="create-page">+ New Page</button>';
        panelBody.appendChild(actions);

        const list = document.createElement('div');
        list.className = 'pages-list';

        pages.forEach(function(page) {
            const item = document.createElement('div');
            item.className = 'page-item' + (page.id === currentPageId ? ' is-current' : '');
            item.dataset.pageId = page.id;

            item.innerHTML = `
                <div class="page-main">
                    <div class="page-title">${esc(page.title)}</div>
                    <div class="page-slug">/${esc(page.slug)}</div>
                </div>
                <div class="page-actions">
                    <button class="page-action-button" type="button" data-action="check-page" data-page-id="${page.id}">Check</button>
                    <button class="page-action-button danger" type="button" data-action="delete-page" data-page-id="${page.id}">Delete</button>
                </div>
            `;

            list.appendChild(item);
        });

        panelBody.appendChild(list);
    }

    function renderElementsPanel(panelBody) {
        panelBody.replaceChildren();

        const hint = document.createElement('div');
        hint.className = 'panel-placeholder';
        hint.textContent = 'Drag an element box into the page iframe.';
        panelBody.appendChild(hint);

        const templates = [
            {
                name: 'Block',
                content: {
                    tag: 'div',
                    text: 'Block Element',
                    children: []
                }
            },
            {
                name: 'Cool Element',
                content: {
                    tag: 'div',
                    attrs: {
                        class: 'cool-element',
                        'data-something': 'some value'
                    },
                    children: [
                        { tag: 'h1', text: 'I am a cool element' },
                        { tag: 'p', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' }
                    ]
                }
            }
        ];

        const list = document.createElement('div');
        list.className = 'elements-list';

        templates.forEach(function(template) {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'page-action-button';
            card.textContent = template.name;
            card.draggable = true;
            card.dataset.templateJson = JSON.stringify(template);
            card.style.display = 'block';
            card.style.width = '100%';
            card.style.marginBottom = '0.5rem';
            list.appendChild(card);
        });

        panelBody.appendChild(list);
    }

    function parseCssStringToObject(cssText) {
        if (typeof cssText !== 'string' || !cssText.trim()) {
            return {};
        }

        const output = {};
        cssText.split('}').forEach(function(block) {
            const parts = block.split('{');
            if (parts.length < 2) {
                return;
            }

            const selector = (parts[0] || '').trim();
            const body = (parts[1] || '').trim();
            if (!selector || !body) {
                return;
            }

            const rules = {};
            body.split(';').forEach(function(decl) {
                const idx = decl.indexOf(':');
                if (idx < 1) {
                    return;
                }

                const prop = decl.slice(0, idx).trim();
                const value = decl.slice(idx + 1).trim();
                if (!prop || !value) {
                    return;
                }

                rules[prop] = value;
            });

            if (Object.keys(rules).length) {
                output[selector] = rules;
            }
        });

        return output;
    }

    function stylesheetToObject(cssData) {
        if (cssData && typeof cssData === 'object' && !Array.isArray(cssData)) {
            const normalized = {};
            Object.entries(cssData).forEach(function(entry) {
                const selector = String(entry[0] || '').trim();
                const rules = entry[1];
                if (!selector || !rules || typeof rules !== 'object') {
                    return;
                }

                normalized[selector] = {};
                Object.entries(rules).forEach(function(ruleEntry) {
                    const prop = String(ruleEntry[0] || '').trim();
                    const value = String(ruleEntry[1] || '').trim();
                    if (!prop || !value) {
                        return;
                    }
                    normalized[selector][prop] = value;
                });
            });
            return normalized;
        }

        return parseCssStringToObject(cssData);
    }

    function getStylesheetByName(name) {
        const site = vsite();
        if (!site || !name) {
            return {};
        }

        if (typeof site.getStylesheet === 'function') {
            return stylesheetToObject(site.getStylesheet(name));
        }

        const data = site.getDataJSON ? site.getDataJSON() : null;
        return stylesheetToObject(data && data.stylesheets ? data.stylesheets[name] : {});
    }

    function createStylePropRow(prop, value) {
        const row = document.createElement('div');
        row.className = 'style-prop-row';

        const propInput = document.createElement('input');
        propInput.type = 'text';
        propInput.className = 'style-input';
        propInput.placeholder = 'property';
        propInput.dataset.role = 'style-prop';
        propInput.value = prop || '';

        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.className = 'style-input';
        valueInput.placeholder = 'value';
        valueInput.dataset.role = 'style-value';
        valueInput.value = value || '';

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'page-action-button danger';
        remove.dataset.action = 'remove-style-prop';
        remove.textContent = 'x';

        row.append(propInput, valueInput, remove);
        return row;
    }

    function createStyleSelectorCard(selector, rules) {
        const card = document.createElement('div');
        card.className = 'style-selector-card';

        const header = document.createElement('div');
        header.className = 'style-selector-head';

        const selectorInput = document.createElement('input');
        selectorInput.type = 'text';
        selectorInput.className = 'style-input style-selector-input';
        selectorInput.placeholder = 'selector query';
        selectorInput.dataset.role = 'style-selector';
        selectorInput.value = selector || '';

        const removeSelector = document.createElement('button');
        removeSelector.type = 'button';
        removeSelector.className = 'page-action-button danger';
        removeSelector.dataset.action = 'remove-style-selector';
        removeSelector.textContent = 'x';

        header.append(selectorInput, removeSelector);

        const props = document.createElement('div');
        props.className = 'style-prop-list';
        props.dataset.role = 'style-prop-list';

        Object.entries(rules || {}).forEach(function(entry) {
            props.appendChild(createStylePropRow(entry[0], entry[1]));
        });

        const addProp = document.createElement('button');
        addProp.type = 'button';
        addProp.className = 'page-action-button';
        addProp.dataset.action = 'add-style-prop';
        addProp.textContent = '+ property';

        card.append(header, props, addProp);
        return card;
    }

    function collectStyleEditorData(panelBody) {
        const output = {};

        panelBody.querySelectorAll('.style-selector-card').forEach(function(card) {
            const selectorInput = card.querySelector('[data-role="style-selector"]');
            const selector = selectorInput ? selectorInput.value.trim() : '';
            if (!selector) {
                return;
            }

            const rules = {};
            card.querySelectorAll('.style-prop-row').forEach(function(row) {
                const propInput = row.querySelector('[data-role="style-prop"]');
                const valueInput = row.querySelector('[data-role="style-value"]');
                const prop = propInput ? propInput.value.trim() : '';
                const value = valueInput ? valueInput.value.trim() : '';
                if (prop && value) {
                    rules[prop] = value;
                }
            });

            output[selector] = rules;
        });

        return output;
    }

    function queueStylesheetSave(panelBody) {
        if (!styleState.activeName) {
            return;
        }

        if (styleState.saveTimer) {
            clearTimeout(styleState.saveTimer);
        }

        styleState.saveTimer = setTimeout(function() {
            const site = vsite();
            if (!site || typeof site.setStylesheet !== 'function') {
                return;
            }

            const nextData = collectStyleEditorData(panelBody);
            site.setStylesheet(styleState.activeName, nextData);
            styleState.saveTimer = null;
        }, 180);
    }

    function renderStylesPanel(panelBody) {
        const site = vsite();
        if (!site) {
            panelBody.replaceChildren();
            return;
        }

        panelBody.replaceChildren();

        const listNames = typeof site.listStylesheets === 'function'
            ? site.listStylesheets()
            : Object.keys((site.getDataJSON() || {}).stylesheets || {});

        if (!styleState.activeName) {
            const title = document.createElement('div');
            title.className = 'styles-header';
            title.textContent = 'Choose a stylesheet';

            const createButton = document.createElement('button');
            createButton.type = 'button';
            createButton.className = 'pages-create-button';
            createButton.dataset.action = 'create-stylesheet';
            createButton.textContent = '+ New Stylesheet';

            const list = document.createElement('div');
            list.className = 'styles-file-list';

            listNames.forEach(function(name) {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'styles-file-item';
                item.dataset.action = 'open-stylesheet';
                item.dataset.styleName = name;
                item.textContent = name;
                list.appendChild(item);
            });

            panelBody.append(title, createButton, list);
            return;
        }

        const top = document.createElement('div');
        top.className = 'styles-editor-top';

        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'page-action-button';
        back.dataset.action = 'close-stylesheet-editor';
        back.textContent = 'Back';

        const name = document.createElement('div');
        name.className = 'styles-editor-name';
        name.textContent = styleState.activeName;

        top.append(back, name);

        const selectorList = document.createElement('div');
        selectorList.className = 'style-selector-list';

        const styleData = getStylesheetByName(styleState.activeName);
        Object.entries(styleData).forEach(function(entry) {
            selectorList.appendChild(createStyleSelectorCard(entry[0], entry[1]));
        });

        const addSelector = document.createElement('button');
        addSelector.type = 'button';
        addSelector.className = 'pages-create-button';
        addSelector.dataset.action = 'add-style-selector';
        addSelector.textContent = '+ Selector';

        panelBody.append(top, selectorList, addSelector);
    }

    const sections = {
        pages: { icon: 'Pg', label: 'Pages', title: 'Pages', render: renderPagesPanel },
        view: {
            icon: 'Vw',
            label: 'View',
            title: 'View',
            minWidth: '30%',
            marginBottom: '1rem',
            render: function(panelBody) {
                setupViewFloater();
                renderViewTree(panelBody);
            }
        },
        templates: {
            icon: 'Tm',
            label: 'Templates',
            title: 'Templates',
            render: function(panelBody) { renderPlaceholder(panelBody, 'Templates coming soon...'); }
        },
        elements: {
            icon: 'El',
            label: 'Elements',
            title: 'Elements',
            marginBottom: '1rem',
            render: renderElementsPanel
        },
        stylesheets: {
            icon: 'Cs',
            label: 'Styles',
            title: 'Stylesheets',
            width: '48%',
            minWidth: '42%',
            render: renderStylesPanel
        },
        scripts: {
            icon: 'Js',
            label: 'Scripts',
            title: 'Scripts',
            marginBottom: '1rem',
            render: function(panelBody) { renderPlaceholder(panelBody, 'Scripts editor coming soon...'); }
        },
        assets: {
            icon: 'As',
            label: 'Assets',
            title: 'Assets',
            render: function(panelBody) { renderPlaceholder(panelBody, 'Assets manager coming soon...'); }
        }
    };

    function renderPanel(sectionKey, title) {
        closeViewContextMenu();
        hideViewTooltip();

        sidebarContent.innerHTML = `
            <div class="sidebar-panel-header">${esc(title)}</div>
            <div class="sidebar-panel-body" data-section="${esc(sectionKey)}"></div>
        `;

        const panelBody = sidebarContent.querySelector('.sidebar-panel-body');
        const renderer = sections[sectionKey] && sections[sectionKey].render;
        if (renderer) {
            renderer(panelBody);
        }
    }

    function openPanel(button) {
        const sectionKey = button.dataset.section;
        const title = button.dataset.title;
        const section = sections[sectionKey];

        if (!sectionKey || !title) {
            return;
        }

        if (activeButton) {
            activeButton.classList.remove('is-active');
        }

        activeButton = button;
        activeButton.classList.add('is-active');

        sidebarContent.style.width = section && section.width ? section.width : '';
        sidebarContent.style.minWidth = section && section.minWidth ? section.minWidth : '';

        renderPanel(sectionKey, title);
        activeSection = sectionKey;

        sidebarContent.classList.add('is-open');
        sidebarContent.setAttribute('aria-hidden', 'false');
    }

    function closePanel() {
        if (activeButton) {
            activeButton.classList.remove('is-active');
            activeButton = null;
        }

        closeViewContextMenu();
        hideViewTooltip();

        sidebarContent.classList.remove('is-open');
        sidebarContent.setAttribute('aria-hidden', 'true');
        activeSection = null;
    }

    const handlers = {
        'create-page': function() {
            const site = vsite();
            if (site) {
                site.addPage({ title: 'New Page', slug: 'new-page' });
            }
        },
        'check-page': function(target) {
            const site = vsite();
            const pageId = target.dataset.pageId;
            if (site && pageId) {
                site.changePage(pageId);
            }
        },
        'delete-page': function(target) {
            const site = vsite();
            const pageId = target.dataset.pageId;
            if (site && pageId) {
                site.removePage(pageId);
            }
        },
        'open-stylesheet': function(target) {
            styleState.activeName = target.dataset.styleName || null;
            const panelBody = sidebarContent.querySelector('.sidebar-panel-body[data-section="stylesheets"]');
            if (panelBody) {
                renderStylesPanel(panelBody);
            }
        },
        'close-stylesheet-editor': function() {
            styleState.activeName = null;
            const panelBody = sidebarContent.querySelector('.sidebar-panel-body[data-section="stylesheets"]');
            if (panelBody) {
                renderStylesPanel(panelBody);
            }
        },
        'create-stylesheet': function() {
            const site = vsite();
            if (!site || typeof site.setStylesheet !== 'function') {
                return;
            }

            let index = 1;
            const names = typeof site.listStylesheets === 'function'
                ? site.listStylesheets()
                : Object.keys((site.getDataJSON() || {}).stylesheets || {});
            while (names.includes(`style-${index}`)) {
                index += 1;
            }

            const newName = `style-${index}`;
            site.setStylesheet(newName, {});
            styleState.activeName = newName;

            const panelBody = sidebarContent.querySelector('.sidebar-panel-body[data-section="stylesheets"]');
            if (panelBody) {
                renderStylesPanel(panelBody);
            }
        },
        'add-style-selector': function(target) {
            const panelBody = target.closest('.sidebar-panel-body');
            const list = panelBody ? panelBody.querySelector('.style-selector-list') : null;
            if (!panelBody || !list) {
                return;
            }

            list.appendChild(createStyleSelectorCard('', {}));
            queueStylesheetSave(panelBody);
        },
        'remove-style-selector': function(target) {
            const panelBody = target.closest('.sidebar-panel-body');
            const card = target.closest('.style-selector-card');
            if (!panelBody || !card) {
                return;
            }

            card.remove();
            queueStylesheetSave(panelBody);
        },
        'add-style-prop': function(target) {
            const panelBody = target.closest('.sidebar-panel-body');
            const card = target.closest('.style-selector-card');
            const list = card ? card.querySelector('[data-role="style-prop-list"]') : null;
            if (!panelBody || !list) {
                return;
            }

            list.appendChild(createStylePropRow('', ''));
            queueStylesheetSave(panelBody);
        },
        'remove-style-prop': function(target) {
            const panelBody = target.closest('.sidebar-panel-body');
            const row = target.closest('.style-prop-row');
            if (!panelBody || !row) {
                return;
            }

            row.remove();
            queueStylesheetSave(panelBody);
        }
    };

    function handlePanelClick(event) {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) {
            return;
        }

        const handler = handlers[actionButton.dataset.action];
        if (handler) {
            handler(actionButton);
        }
    }

    function handlePanelInput(event) {
        if (activeSection !== 'stylesheets' || !sidebarContent.classList.contains('is-open')) {
            return;
        }

        if (!event.target.closest('.sidebar-panel-body[data-section="stylesheets"]')) {
            return;
        }

        const panelBody = sidebarContent.querySelector('.sidebar-panel-body[data-section="stylesheets"]');
        if (panelBody) {
            queueStylesheetSave(panelBody);
        }
    }

    function handlePanelDragStart(event) {
        const templateSource = event.target.closest('[data-template-json]');
        if (templateSource && event.dataTransfer) {
            const templateJSON = templateSource.dataset.templateJson || '';
            if (!templateJSON) {
                return;
            }

            event.dataTransfer.setData('application/x-ezvs-template', templateJSON);
            event.dataTransfer.effectAllowed = 'copy';
            return;
        }

        const viewNode = event.target.closest('.view-node-card[data-node-id]');
        if (viewNode && event.dataTransfer) {
            event.dataTransfer.setData('application/x-ezvs-node-id', viewNode.dataset.nodeId || '');
            event.dataTransfer.effectAllowed = 'move';
        }
    }

    function handlePanelDragOver(event) {
        const dropTarget = event.target.closest('[data-drop-parent-id]');
        if (!dropTarget || !event.dataTransfer) {
            return;
        }

        if (!(event.dataTransfer.types || []).includes('application/x-ezvs-node-id')) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        clearTreeDropTargets();
        dropTarget.classList.add('is-drag-over');
    }

    function handlePanelDragLeave(event) {
        const dropTarget = event.target.closest('[data-drop-parent-id]');
        if (dropTarget) {
            dropTarget.classList.remove('is-drag-over');
        }
    }

    function handlePanelDrop(event) {
        closeViewContextMenu();
        hideViewTooltip();

        const dropTarget = event.target.closest('[data-drop-parent-id]');
        const site = vsite();
        if (!dropTarget || !site || !event.dataTransfer) {
            return;
        }

        const draggedNodeId = event.dataTransfer.getData('application/x-ezvs-node-id');
        if (!draggedNodeId) {
            return;
        }

        event.preventDefault();

        const parentId = dropTarget.dataset.dropParentId || null;
        if (draggedNodeId !== parentId && typeof site.reparentNode === 'function') {
            site.reparentNode(draggedNodeId, parentId);
        }

        clearTreeDropTargets();
        rerenderViewPanel();
    }

    function handlePanelDragEnd() {
        clearTreeDropTargets();
        hideViewTooltip();
    }

    function handleSidebarButtonClick(button) {
        const isSameButton = activeButton === button;
        const isOpen = sidebarContent.classList.contains('is-open');

        if (isSameButton && isOpen) {
            closePanel();
            return;
        }

        openPanel(button);
    }

    function initializeSidebar() {
        Object.entries(sections).forEach(function(entry) {
            const sectionId = entry[0];
            const section = entry[1];

            const button = document.createElement('button');
            button.className = 'sidebar-button';
            button.type = 'button';
            button.dataset.section = sectionId;
            button.dataset.title = section.title;
            button.setAttribute('aria-controls', 'sidebar-content');

            const icon = document.createElement('span');
            icon.className = 'sidebar-icon';
            icon.textContent = section.icon;

            const label = document.createElement('span');
            label.className = 'sidebar-label';
            label.textContent = section.label;

            button.append(icon, label);

            if (section.marginBottom) {
                button.style.marginBottom = section.marginBottom;
            }

            sidebarButtons.appendChild(button);
            button.addEventListener('click', function() {
                handleSidebarButtonClick(button);
            });
        });

        sidebarContent.addEventListener('click', handlePanelClick);
        sidebarContent.addEventListener('input', handlePanelInput);
        sidebarContent.addEventListener('dragstart', handlePanelDragStart);
        sidebarContent.addEventListener('dragover', handlePanelDragOver);
        sidebarContent.addEventListener('dragleave', handlePanelDragLeave);
        sidebarContent.addEventListener('drop', handlePanelDrop);
        sidebarContent.addEventListener('dragend', handlePanelDragEnd);

        document.addEventListener('wc:editor-ready', setupViewFloater);
        setupViewFloater();

        document.addEventListener('wc:pages-changed', function() {
            if (activeSection === 'view' && sidebarContent.classList.contains('is-open')) {
                rerenderViewPanel();
            }

            if (activeSection === 'pages' && sidebarContent.classList.contains('is-open')) {
                const panelBody = sidebarContent.querySelector('.sidebar-panel-body[data-section="pages"]');
                if (panelBody) {
                    renderPagesPanel(panelBody);
                }
            }
        });

        document.addEventListener('wc:page-selected', function() {
            if (activeSection === 'view' && sidebarContent.classList.contains('is-open')) {
                closeViewContextMenu();
                hideViewTooltip();
                rerenderViewPanel();
            }
        });

        document.addEventListener('wc:page-content-changed', function() {
            if (activeSection === 'view' && sidebarContent.classList.contains('is-open')) {
                rerenderViewPanel();
            }

            if (activeSection === 'stylesheets' && sidebarContent.classList.contains('is-open')) {
                const panelBody = sidebarContent.querySelector('.sidebar-panel-body[data-section="stylesheets"]');
                if (panelBody) {
                    renderStylesPanel(panelBody);
                }
            }
        });
    }

    initializeSidebar();
})();
