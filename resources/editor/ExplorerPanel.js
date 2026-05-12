import { BUS } from './constants.js';
import { uniqueName } from './utils.js';
import { ZTree } from '../js/global/ZTree.js';

const ROOT_FOLDER_ID = 'root';
const CORE_FOLDER_IDS = {
    pages: 'pages',
    styles: 'styles',
    scripts: 'scripts',
};

function clone(value) {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}

export class ExplorerPanel {
    constructor(options) {
        this.bus = options.bus;
        this.runtime = options.runtime;
        this.tabs = options.tabs;
        this.navElement = options.navElement;
        this.panelElement = options.panelElement;
        this.resizeHandle = options.resizeHandle;
        this.layoutRoot = options.layoutRoot || document.body;

        this.tree = null;
        this.treeContainer = null;
        this.createMenuElement = null;
        this.isOpen = false;

        this.floater = null;
        this.dragState = null;

        this.isResizing = false;
        this.pointerId = null;
        this.startPointerX = 0;
        this.startPanelWidth = 0;

        this.inlineEdit = null;
        this.createMenuOpen = false;
        this.createOptions = [];
        this.registerDefaultCreateOptions();
    }

    init() {
        this.renderNav();
        this.renderPanelShell();
        this.bindPanelEvents();
        this.bindRuntimeEvents();
        this.initResize();
        this.setupFloater();
        this.open();
    }

    renderNav() {
        this.navElement.innerHTML = '';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'side-nav-button';
        button.dataset.sideKey = 'explorer';
        button.innerHTML = `
            <span class="side-nav-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 6h7l2 2h9v10H3z"></path>
                </svg>
            </span>
            <span class="side-nav-label">Explorer</span>
        `;

        button.addEventListener('click', () => {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        });

        this.navElement.appendChild(button);
    }

    renderPanelShell() {
        this.panelElement.innerHTML = `
            <div class="explorer-panel">
                <header class="explorer-header">
                    <h2>EXPLORER</h2>
                    <div class="explorer-actions">
                        <button type="button" data-action="toggle-create-menu" title="Create">+</button>
                        <div class="explorer-create-menu" hidden></div>
                    </div>
                </header>
                <div class="explorer-tree-wrap">
                    <div class="explorer-tree"></div>
                </div>
            </div>
        `;

        this.treeContainer = this.panelElement.querySelector('.explorer-tree');
        this.createMenuElement = this.panelElement.querySelector('.explorer-create-menu');
        this.renderCreateMenu();
    }

    bindPanelEvents() {
        this.panelElement.addEventListener('click', (event) => {
            const action = event.target.closest('[data-action]');
            if (!action) {
                return;
            }

            const actionName = action.dataset.action || '';
            const optionKey = action.dataset.optionKey || '';
            this.handleAction(actionName, optionKey);
        });

        document.addEventListener('mousedown', (event) => {
            if (!this.createMenuOpen) {
                return;
            }
            if (!this.panelElement.contains(event.target)) {
                this.closeCreateMenu();
            }
        });
    }

    bindRuntimeEvents() {
        this.bus.on(BUS.READY, () => this.refreshTree());
        this.bus.on(BUS.PAGES_CHANGED, () => this.refreshTree());
        this.bus.on(BUS.STYLES_CHANGED, () => this.refreshTree());
        this.bus.on(BUS.SCRIPTS_CHANGED, () => this.refreshTree());
    }

    open() {
        this.isOpen = true;
        this.panelElement.classList.add('is-open');
        this.panelElement.setAttribute('aria-hidden', 'false');
        this.layoutRoot.classList.add('has-open-sidebar');
        const navButton = this.navElement.querySelector('.side-nav-button');
        if (navButton) {
            navButton.classList.add('is-active');
        }
        this.refreshTree();
    }

    close() {
        this.isOpen = false;
        this.panelElement.classList.remove('is-open');
        this.panelElement.setAttribute('aria-hidden', 'true');
        this.layoutRoot.classList.remove('has-open-sidebar');
        const navButton = this.navElement.querySelector('.side-nav-button');
        if (navButton) {
            navButton.classList.remove('is-active');
        }
        this.closeCreateMenu();
        this.handleResizeEnd();
    }

    refreshTree() {
        if (!this.isOpen || !this.treeContainer) {
            return;
        }

        const site = this.runtime.getSite();
        if (!site) {
            this.treeContainer.innerHTML = '<div class="explorer-empty">Loading project...</div>';
            return;
        }

        this.ensureLayout(site);
        this.tree = this.buildTreeModel(site);
        this.renderTree(this.tree);
    }

    buildTreeModel(site) {
        const layout = this.getLayout(site);
        const draft = window.creatorDraft || {};
        const projectName = String(draft.project_name || 'project');

        const tree = new ZTree(projectName);
        const rootTreeNode = tree.getNode(tree.rootId);
        rootTreeNode.set('kind', 'folder');
        rootTreeNode.set('uid', ROOT_FOLDER_ID);
        rootTreeNode.set('locked', true);
        rootTreeNode.set('collapsed', false);

        const folderTreeIdByUid = new Map([[ROOT_FOLDER_ID, tree.rootId]]);
        this.addFolderChildrenToTree(tree, folderTreeIdByUid, layout, ROOT_FOLDER_ID);

        const attachFile = (definition) => {
            const parentUid = this.resolveFileParent(layout, definition.uid, definition.defaultParentUid);
            const parentTreeId = folderTreeIdByUid.get(parentUid) || folderTreeIdByUid.get(definition.defaultParentUid);
            if (parentTreeId === undefined) {
                return;
            }

            const file = tree.addNode(definition.label, parentTreeId);
            if (!file) {
                return;
            }

            file.node.set('kind', definition.kind);
            file.node.set('uid', definition.uid);
            file.node.set('parentUid', parentUid);
            file.node.set('locked', false);
            Object.entries(definition.meta || {}).forEach(function(entry) {
                file.node.set(entry[0], entry[1]);
            });
        };

        site.listPages().forEach((page) => {
            const title = String(page.title || page.id).trim() || page.id;
            attachFile({
                kind: 'page',
                uid: `page:${page.id}`,
                label: title,
                defaultParentUid: CORE_FOLDER_IDS.pages,
                meta: {
                    pageId: page.id,
                    slug: String(page.slug || page.id),
                    extension: '.page',
                },
            });
        });

        site.listStylesheets().forEach((name) => {
            attachFile({
                kind: 'style',
                uid: `style:${name}`,
                label: name,
                defaultParentUid: CORE_FOLDER_IDS.styles,
                meta: {
                    styleName: name,
                    extension: '.css',
                },
            });
        });

        const data = site.getDataJSON() || {};
        Object.keys(data.scripts || {}).forEach((name) => {
            attachFile({
                kind: 'script',
                uid: `script:${name}`,
                label: name,
                defaultParentUid: CORE_FOLDER_IDS.scripts,
                meta: {
                    scriptName: name,
                    extension: '.js',
                },
            });
        });

        return tree;
    }

    addFolderChildrenToTree(tree, folderTreeIdByUid, layout, parentUid) {
        const childFolders = Object.values(layout.folders)
            .filter((folder) => folder.parentId === parentUid && folder.id !== ROOT_FOLDER_ID)
            .sort((a, b) => {
                if (Boolean(a.locked) !== Boolean(b.locked)) {
                    return a.locked ? -1 : 1;
                }
                return String(a.name).localeCompare(String(b.name));
            });

        childFolders.forEach((folder) => {
            const parentTreeId = folderTreeIdByUid.get(parentUid);
            if (parentTreeId === undefined) {
                return;
            }

            const inserted = tree.addNode(folder.name, parentTreeId);
            if (!inserted) {
                return;
            }

            inserted.node.set('kind', 'folder');
            inserted.node.set('uid', folder.id);
            inserted.node.set('locked', Boolean(folder.locked));
            inserted.node.set('collapsed', Boolean(layout.collapsed[folder.id]));
            folderTreeIdByUid.set(folder.id, inserted.id);

            this.addFolderChildrenToTree(tree, folderTreeIdByUid, layout, folder.id);
        });
    }

    resolveFileParent(layout, fileUid, fallbackParentUid) {
        const parentUid = layout.placements[fileUid];
        if (parentUid && layout.folders[parentUid]) {
            return parentUid;
        }
        return fallbackParentUid;
    }

    renderTree(tree) {
        const root = tree.getNode(tree.rootId);
        if (!root) {
            this.treeContainer.innerHTML = '<div class="explorer-empty">Empty project.</div>';
            return;
        }

        const list = document.createElement('ul');
        list.className = 'explorer-tree-root';
        list.appendChild(this.renderNode(tree, tree.rootId, 0));
        this.treeContainer.replaceChildren(list);
    }

    renderNode(tree, nodeId, depth) {
        const node = tree.getNode(nodeId);
        const item = document.createElement('li');
        item.className = 'explorer-tree-item';
        if (!node) {
            return item;
        }

        const uid = String(node.get('uid') || '');
        const kind = String(node.get('kind') || 'file');
        const isFolder = kind === 'folder';
        const collapsed = Boolean(node.get('collapsed'));
        const parentUid = String(node.parent !== null ? (tree.getNode(node.parent)?.get('uid') || '') : '');
        const locked = Boolean(node.get('locked'));

        const row = document.createElement('button');
        row.type = 'button';
        row.className = `explorer-tree-row is-${kind}`;
        row.style.paddingLeft = `${0.45 + depth * 0.9}rem`;
        row.dataset.nodeId = String(nodeId);
        row.dataset.uid = uid;
        row.dataset.kind = kind;
        row.dataset.parentUid = parentUid;
        row.dataset.locked = locked ? 'true' : 'false';

        const twisty = document.createElement('span');
        twisty.className = 'explorer-tree-twisty';
        twisty.innerHTML = isFolder
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>'
            : '';
        twisty.classList.toggle('is-open', isFolder && !collapsed);

        const icon = document.createElement('span');
        icon.className = 'explorer-tree-icon';
        icon.innerHTML = this.getIconSVG(kind);

        const labelWrap = document.createElement('span');
        labelWrap.className = 'explorer-tree-label-wrap';

        const label = document.createElement('span');
        label.className = 'explorer-tree-label';
        label.textContent = node.name || '';
        labelWrap.appendChild(label);

        const ext = String(node.get('extension') || '');
        if (ext) {
            const extension = document.createElement('span');
            extension.className = 'explorer-tree-ext';
            extension.textContent = ext;
            labelWrap.appendChild(extension);
        }

        if (kind === 'page') {
            const slugMeta = document.createElement('span');
            slugMeta.className = 'explorer-tree-meta';
            slugMeta.textContent = `[${String(node.get('slug') || '')}]`;
            labelWrap.appendChild(slugMeta);
        }

        if (this.inlineEdit && this.inlineEdit.uid === uid) {
            labelWrap.replaceChildren();
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'explorer-tree-rename-input';
            input.value = this.inlineEdit.value;
            input.dataset.renameUid = uid;
            input.dataset.renameKind = kind;
            labelWrap.appendChild(input);
            if (ext) {
                const extension = document.createElement('span');
                extension.className = 'explorer-tree-ext';
                extension.textContent = ext;
                labelWrap.appendChild(extension);
            }
            if (kind === 'page') {
                const slugMeta = document.createElement('span');
                slugMeta.className = 'explorer-tree-meta';
                slugMeta.textContent = `[${String(node.get('slug') || '')}]`;
                labelWrap.appendChild(slugMeta);
            }
        }

        row.append(twisty, icon, labelWrap);
        item.appendChild(row);

        const canDrag = !(kind === 'folder' && (uid === ROOT_FOLDER_ID || locked)) && !(this.inlineEdit && this.inlineEdit.uid === uid);
        row.draggable = canDrag;
        row.addEventListener('dragstart', (event) => this.onRowDragStart(event, row));
        row.addEventListener('dragover', (event) => this.onRowDragOver(event, row));
        row.addEventListener('dragleave', (event) => this.onRowDragLeave(event, row));
        row.addEventListener('drop', (event) => this.onRowDrop(event, row));
        row.addEventListener('dragend', () => this.onRowDragEnd());

        row.addEventListener('click', () => {
            if (this.inlineEdit && this.inlineEdit.uid === uid) {
                return;
            }
            if (isFolder) {
                this.toggleFolder(uid);
                return;
            }
            this.activateFileNode(node);
        });

        row.addEventListener('dblclick', (event) => {
            event.preventDefault();
            if (this.canInlineRename(kind, uid, locked)) {
                this.startInlineRename(kind, uid, node);
            }
        });

        if (isFolder && !collapsed && node.children.length > 0) {
            const childrenList = document.createElement('ul');
            childrenList.className = 'explorer-tree-children';
            node.children.forEach((childId) => {
                childrenList.appendChild(this.renderNode(tree, childId, depth + 1));
            });
            item.appendChild(childrenList);
        }

        return item;
    }

    canInlineRename(kind, uid, locked) {
        if (kind === 'folder') {
            return false;
        }
        if (kind === 'page' || kind === 'style' || kind === 'script') {
            return !locked && uid !== ROOT_FOLDER_ID;
        }
        return false;
    }

    getIconSVG(kind) {
        if (kind === 'folder') {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h7l2 2h9v10H3z"></path></svg>';
        }

        if (kind === 'page') {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l5 5v13H6zM14 4.5V9h4.5"></path></svg>';
        }

        if (kind === 'style') {
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v3H4zm0 5.5h16v3H4zM4 16h16v3H4z"></path></svg>';
        }

        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6 3 12l5 6 1.8-1.5L6.1 12l3.7-4.5zm8 0-1.8 1.5 3.7 4.5-3.7 4.5L16 18l5-6z"></path></svg>';
    }

    onRowDragStart(event, row) {
        const uid = row.dataset.uid || '';
        const kind = row.dataset.kind || '';
        if (!uid || !kind) {
            event.preventDefault();
            return;
        }

        if (kind === 'folder' && (uid === ROOT_FOLDER_ID || row.dataset.locked === 'true')) {
            event.preventDefault();
            return;
        }

        this.dragState = {
            uid: uid,
            kind: kind,
        };

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', uid);
        }

        row.classList.add('is-dragging');
    }

    onRowDragOver(event, row) {
        if (!this.dragState) {
            return;
        }

        const site = this.runtime.getSite();
        if (!site) {
            return;
        }

        const layout = this.getLayout(site);
        const targetFolderUid = this.resolveDropTargetFolderUid(row);
        if (!targetFolderUid) {
            return;
        }

        if (!this.canReparent(layout, this.dragState.uid, this.dragState.kind, targetFolderUid)) {
            return;
        }

        event.preventDefault();
        row.classList.add('is-drop-target');
    }

    onRowDragLeave(event, row) {
        const related = event.relatedTarget;
        if (related && row.contains(related)) {
            return;
        }
        row.classList.remove('is-drop-target');
    }

    onRowDrop(event, row) {
        row.classList.remove('is-drop-target');
        if (!this.dragState) {
            return;
        }

        const site = this.runtime.getSite();
        if (!site) {
            return;
        }

        const layout = this.getLayout(site);
        const targetFolderUid = this.resolveDropTargetFolderUid(row);
        if (!targetFolderUid) {
            return;
        }

        if (!this.canReparent(layout, this.dragState.uid, this.dragState.kind, targetFolderUid)) {
            return;
        }

        event.preventDefault();
        this.reparentLayoutNode(site, layout, this.dragState.uid, this.dragState.kind, targetFolderUid);
        this.dragState = null;
        this.refreshTree();
    }

    onRowDragEnd() {
        this.dragState = null;
        this.panelElement.querySelectorAll('.explorer-tree-row.is-drop-target, .explorer-tree-row.is-dragging').forEach(function(row) {
            row.classList.remove('is-drop-target', 'is-dragging');
        });
    }

    resolveDropTargetFolderUid(row) {
        const targetKind = row.dataset.kind || '';
        const targetUid = row.dataset.uid || '';
        const targetParentUid = row.dataset.parentUid || '';
        if (!targetUid) {
            return null;
        }

        if (targetKind === 'folder') {
            return targetUid;
        }

        return targetParentUid || null;
    }

    canReparent(layout, sourceUid, sourceKind, targetFolderUid) {
        if (!layout.folders[targetFolderUid]) {
            return false;
        }

        if (sourceKind === 'folder') {
            const folder = layout.folders[sourceUid];
            if (!folder || folder.locked || sourceUid === ROOT_FOLDER_ID) {
                return false;
            }

            if (sourceUid === targetFolderUid) {
                return false;
            }

            if (this.isFolderAncestor(layout, sourceUid, targetFolderUid)) {
                return false;
            }

            return true;
        }

        return true;
    }

    isFolderAncestor(layout, ancestorUid, candidateChildUid) {
        let current = layout.folders[candidateChildUid];
        while (current) {
            if (current.id === ancestorUid) {
                return true;
            }
            current = layout.folders[current.parentId];
        }
        return false;
    }

    reparentLayoutNode(site, layout, sourceUid, sourceKind, targetFolderUid) {
        if (sourceKind === 'folder') {
            layout.folders[sourceUid].parentId = targetFolderUid;
        } else {
            layout.placements[sourceUid] = targetFolderUid;
        }

        this.saveLayout(site, layout);
    }

    toggleFolder(folderUid) {
        const site = this.runtime.getSite();
        if (!site) {
            return;
        }

        const layout = this.getLayout(site);
        layout.collapsed[folderUid] = !Boolean(layout.collapsed[folderUid]);
        this.saveLayout(site, layout);
        this.refreshTree();
    }

    activateFileNode(node) {
        const kind = node.get('kind');
        if (kind === 'page') {
            const pageId = node.get('pageId');
            if (pageId) {
                this.tabs.openPageTab(pageId);
            }
            return;
        }

        if (kind === 'style') {
            const styleName = node.get('styleName');
            if (styleName) {
                this.tabs.openStyleTab(styleName);
            }
            return;
        }

        if (kind === 'script') {
            const scriptName = node.get('scriptName');
            if (scriptName) {
                this.tabs.openScriptTab(scriptName);
            }
        }
    }

    handleAction(action, optionKey = '') {
        if (action === 'toggle-create-menu') {
            if (this.createMenuOpen) {
                this.closeCreateMenu();
            } else {
                this.openCreateMenu();
            }
            return;
        }

        if (action === 'create-option' && optionKey) {
            const option = this.createOptions.find(function(item) {
                return item.key === optionKey;
            });
            if (option && typeof option.run === 'function') {
                option.run();
            }
            this.closeCreateMenu();
        }
    }

    registerDefaultCreateOptions() {
        this.registerCreateOption({
            key: 'page',
            label: 'Page',
            title: 'Create new page',
            run: () => {
                const site = this.runtime.getSite();
                if (!site) {
                    return;
                }
                const pageId = site.addPage({ title: 'New Page' });
                site.changePage(pageId);
                this.tabs.openPageTab(pageId);
            },
        });

        this.registerCreateOption({
            key: 'folder',
            label: 'Folder',
            title: 'Create new folder',
            run: () => {
                const site = this.runtime.getSite();
                if (!site) {
                    return;
                }

                const layout = this.getLayout(site);
                const folderNameRaw = window.prompt('Folder name', 'new-folder');
                if (folderNameRaw === null) {
                    return;
                }

                const folderName = folderNameRaw.trim() || 'new-folder';
                const folderId = `folder-${layout.nextFolderCounter++}`;
                layout.folders[folderId] = {
                    id: folderId,
                    name: folderName,
                    parentId: ROOT_FOLDER_ID,
                    locked: false,
                };
                layout.collapsed[folderId] = false;
                this.saveLayout(site, layout);
                this.refreshTree();
            },
        });

        this.registerCreateOption({
            key: 'stylesheet',
            label: 'Stylesheet',
            title: 'Create stylesheet file',
            run: () => {
                const site = this.runtime.getSite();
                if (!site) {
                    return;
                }

                const styleName = uniqueName('global', site.listStylesheets());
                site.setStylesheet(styleName, {});
                this.tabs.openStyleTab(styleName);
                this.bus.emit(BUS.STYLES_CHANGED, { styleName: styleName });
            },
        });

        this.registerCreateOption({
            key: 'script',
            label: 'Script',
            title: 'Create script file',
            run: () => {
                const site = this.runtime.getSite();
                if (!site) {
                    return;
                }

                const data = site.getDataJSON() || {};
                const names = Object.keys(data.scripts || {});
                const scriptName = uniqueName('global-script', names);
                site.addScript(scriptName, {
                    variables: {},
                    actions: {},
                    events: {},
                });
                this.tabs.openScriptTab(scriptName);
                this.bus.emit(BUS.SCRIPTS_CHANGED, { scriptName: scriptName });
            },
        });
    }

    registerCreateOption(option) {
        if (!option || !option.key || typeof option.run !== 'function') {
            return;
        }

        const exists = this.createOptions.some(function(item) {
            return item.key === option.key;
        });
        if (exists) {
            return;
        }

        this.createOptions.push({
            key: String(option.key),
            label: String(option.label || option.key),
            title: String(option.title || option.label || option.key),
            run: option.run,
        });
    }

    renderCreateMenu() {
        if (!this.createMenuElement) {
            return;
        }

        const html = this.createOptions.map(function(option) {
            return `<button type="button" data-action="create-option" data-option-key="${option.key}" title="${option.title}">${option.label}</button>`;
        }).join('');

        this.createMenuElement.innerHTML = html;
    }

    openCreateMenu() {
        if (!this.createMenuElement) {
            return;
        }
        this.createMenuOpen = true;
        this.createMenuElement.hidden = false;
    }

    closeCreateMenu() {
        if (!this.createMenuElement) {
            return;
        }
        this.createMenuOpen = false;
        this.createMenuElement.hidden = true;
    }

    setupFloater() {
        if (!window.EzFloater) {
            return;
        }

        this.floater = new window.EzFloater();
        this.floater.addDisplay('explorer-node', {
            context: (row) => this.buildContextMenu(row),
        });

        this.floater.addAction('explorer-rename', (button) => {
            const uid = button.dataset.uid || '';
            const kind = button.dataset.kind || '';
            this.renameEntry(kind, uid);
            this.floater.hide();
        });

        this.floater.addAction('explorer-delete', (button) => {
            const uid = button.dataset.uid || '';
            const kind = button.dataset.kind || '';
            this.deleteEntry(kind, uid);
            this.floater.hide();
        });

        this.floater.addQuery('.explorer-tree-row[data-uid]', { display: 'explorer-node', delegate: true });
    }

    buildContextMenu(row) {
        const uid = row.dataset.uid || '';
        const kind = row.dataset.kind || '';
        const locked = row.dataset.locked === 'true';
        const wrapper = document.createElement('div');
        wrapper.className = 'explorer-context-menu';

        const add = (text, action, data = {}, danger = false) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'explorer-context-button';
            if (danger) {
                button.classList.add('is-danger');
            }
            button.textContent = text;
            button.dataset.click = action;
            Object.entries(data).forEach(function(entry) {
                button.dataset[entry[0]] = String(entry[1]);
            });
            wrapper.appendChild(button);
        };

        const title = document.createElement('div');
        title.className = 'explorer-context-title';
        title.textContent = row.querySelector('.explorer-tree-label')?.textContent || '';
        if (kind === 'page') {
            const slug = row.querySelector('.explorer-tree-meta')?.textContent || '';
            const meta = document.createElement('span');
            meta.textContent = ` ${slug}`;
            title.appendChild(meta);
        }
        wrapper.appendChild(title);

        const divider = document.createElement('div');
        divider.className = 'explorer-context-divider';
        wrapper.appendChild(divider);

        if (!(kind === 'folder' && (locked || uid === ROOT_FOLDER_ID))) {
            add('Rename', 'explorer-rename', { kind: kind, uid: uid });
            add('Delete', 'explorer-delete', { kind: kind, uid: uid }, true);
        }

        return wrapper;
    }

    renameEntry(kind, uid, inlineValue = null) {
        const site = this.runtime.getSite();
        if (!site || !kind || !uid) {
            return;
        }

        if (kind === 'folder') {
            const layout = this.getLayout(site);
            const folder = layout.folders[uid];
            if (!folder || folder.locked || uid === ROOT_FOLDER_ID) {
                return;
            }
            const next = window.prompt('Folder name', folder.name || '');
            if (next === null) {
                return;
            }
            folder.name = next.trim() || folder.name || 'folder';
            this.saveLayout(site, layout);
            this.refreshTree();
            return;
        }

        if (kind === 'page') {
            const pageId = uid.replace(/^page:/, '');
            const page = site.getPageData(pageId);
            if (!page) {
                return;
            }

            let nextTitle = '';
            if (inlineValue !== null && inlineValue !== undefined) {
                nextTitle = String(inlineValue).trim() || page.title || 'Page';
            } else {
                const nextTitleRaw = window.prompt('Page name', page.title || '');
                if (nextTitleRaw === null) {
                    return;
                }
                nextTitle = nextTitleRaw.trim() || page.title || 'Page';
            }
            site.updatePage(pageId, { title: nextTitle });
            this.refreshTree();
            return;
        }

        if (kind === 'style') {
            const oldName = uid.replace(/^style:/, '');
            let nextName = '';
            if (inlineValue !== null && inlineValue !== undefined) {
                nextName = this.normalizeStyleName(String(inlineValue).trim() || oldName);
            } else {
                const nextRaw = window.prompt('Stylesheet name', oldName);
                if (nextRaw === null) {
                    return;
                }
                nextName = this.normalizeStyleName(nextRaw.trim() || oldName);
            }
            this.renameStylesheet(site, oldName, nextName);
            return;
        }

        if (kind === 'script') {
            const oldName = uid.replace(/^script:/, '');
            let nextName = '';
            if (inlineValue !== null && inlineValue !== undefined) {
                nextName = this.normalizeScriptName(String(inlineValue).trim() || oldName);
            } else {
                const nextRaw = window.prompt('Script name', oldName);
                if (nextRaw === null) {
                    return;
                }
                nextName = this.normalizeScriptName(nextRaw.trim() || oldName);
            }
            this.renameScript(site, oldName, nextName);
        }
    }

    deleteEntry(kind, uid) {
        const site = this.runtime.getSite();
        if (!site || !kind || !uid) {
            return;
        }

        if (kind === 'folder') {
            const layout = this.getLayout(site);
            const folder = layout.folders[uid];
            if (!folder || folder.locked || uid === ROOT_FOLDER_ID) {
                return;
            }

            if (!window.confirm(`Delete folder "${folder.name}"?`)) {
                return;
            }

            const parentId = folder.parentId || ROOT_FOLDER_ID;
            Object.values(layout.folders).forEach((candidate) => {
                if (candidate.parentId === uid) {
                    candidate.parentId = parentId;
                }
            });
            Object.keys(layout.placements).forEach((fileUid) => {
                if (layout.placements[fileUid] === uid) {
                    layout.placements[fileUid] = parentId;
                }
            });
            delete layout.folders[uid];
            delete layout.collapsed[uid];
            this.saveLayout(site, layout);
            this.refreshTree();
            return;
        }

        if (kind === 'page') {
            const pageId = uid.replace(/^page:/, '');
            if (!window.confirm('Delete page?')) {
                return;
            }
            site.removePage(pageId);
            this.tabs.closeTabsByPrefix(`page:${pageId}`);
            this.cleanupLayoutForMissingFiles(site);
            return;
        }

        if (kind === 'style') {
            const styleName = uid.replace(/^style:/, '');
            if (!window.confirm(`Delete stylesheet "${styleName}"?`)) {
                return;
            }
            site.removeStylesheet(styleName);
            this.tabs.closeTabsByPrefix(`style:${styleName}`);
            this.cleanupLayoutForMissingFiles(site);
            return;
        }

        if (kind === 'script') {
            const scriptName = uid.replace(/^script:/, '');
            if (!window.confirm(`Delete script "${scriptName}"?`)) {
                return;
            }
            site.removeScript(scriptName);
            this.tabs.closeTabsByPrefix(`script:${scriptName}`);
            this.bus.emit(BUS.SCRIPTS_CHANGED, { scriptName: scriptName });
            this.cleanupLayoutForMissingFiles(site);
        }
    }

    renameStylesheet(site, fromName, toName) {
        const nextName = this.normalizeStyleName(toName.trim());
        if (!nextName) {
            return;
        }
        if (fromName === nextName) {
            return;
        }

        const names = new Set(site.listStylesheets());
        if (!names.has(fromName) || names.has(nextName)) {
            return;
        }

        const source = site.getStylesheet(fromName);
        if (source === null || source === undefined) {
            return;
        }

        site.setStylesheet(nextName, source);
        site.listPages().forEach((page) => {
            const includes = site.getPageIncludes(page.id) || { css: [] };
            const cssIncludes = Array.isArray(includes.css) ? includes.css : [];
            if (cssIncludes.includes(fromName)) {
                site.addPageInclude('css', nextName, page.id);
                site.removePageInclude('css', fromName, page.id);
            }
        });
        site.removeStylesheet(fromName);

        const layout = this.getLayout(site);
        const oldUid = `style:${fromName}`;
        const newUid = `style:${nextName}`;
        if (layout.placements[oldUid]) {
            layout.placements[newUid] = layout.placements[oldUid];
            delete layout.placements[oldUid];
            this.saveLayout(site, layout);
        }

        this.tabs.closeTabsByPrefix(oldUid);
        this.tabs.openStyleTab(nextName);
        this.bus.emit(BUS.STYLES_CHANGED, { styleName: nextName });
        this.refreshTree();
    }

    renameScript(site, fromName, toName) {
        const nextName = this.normalizeScriptName(toName.trim());
        if (!nextName) {
            return;
        }
        if (fromName === nextName) {
            return;
        }

        const data = site.getDataJSON() || {};
        const scripts = data.scripts || {};
        if (!scripts[fromName] || scripts[nextName]) {
            return;
        }

        const source = site.getScript(fromName);
        if (!source) {
            return;
        }

        site.addScript(nextName, source);
        site.listPages().forEach((page) => {
            const includes = site.getPageIncludes(page.id) || { js: [] };
            const jsIncludes = Array.isArray(includes.js) ? includes.js : [];
            if (jsIncludes.includes(fromName)) {
                site.addPageInclude('js', nextName, page.id);
                site.removePageInclude('js', fromName, page.id);
            }
        });
        site.removeScript(fromName);

        const layout = this.getLayout(site);
        const oldUid = `script:${fromName}`;
        const newUid = `script:${nextName}`;
        if (layout.placements[oldUid]) {
            layout.placements[newUid] = layout.placements[oldUid];
            delete layout.placements[oldUid];
            this.saveLayout(site, layout);
        }

        this.tabs.closeTabsByPrefix(oldUid);
        this.tabs.openScriptTab(nextName);
        this.bus.emit(BUS.SCRIPTS_CHANGED, { scriptName: nextName });
        this.refreshTree();
    }

    createFolderUnder(parentUid) {
        const site = this.runtime.getSite();
        if (!site) {
            return;
        }

        const layout = this.getLayout(site);
        if (!layout.folders[parentUid]) {
            return;
        }

        const nameRaw = window.prompt('Folder name', 'new-folder');
        if (nameRaw === null) {
            return;
        }

        const folderId = `folder-${layout.nextFolderCounter++}`;
        layout.folders[folderId] = {
            id: folderId,
            name: nameRaw.trim() || 'new-folder',
            parentId: parentUid,
            locked: false,
        };
        layout.collapsed[folderId] = false;
        this.saveLayout(site, layout);
        this.refreshTree();
    }

    startInlineRename(kind, uid, node) {
        const value = this.getRenameSeed(kind, uid, node);
        if (!value) {
            return;
        }
        this.inlineEdit = { kind: kind, uid: uid, value: value };
        this.refreshTree();
        setTimeout(() => {
            const input = this.panelElement.querySelector(`.explorer-tree-rename-input[data-rename-uid="${CSS.escape(uid)}"]`);
            if (!input) {
                return;
            }
            input.focus();
            input.select();
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.commitInlineRename(input.value);
                    return;
                }
                if (event.key === 'Escape') {
                    event.preventDefault();
                    this.cancelInlineRename();
                }
            }, { once: false });
            input.addEventListener('blur', () => {
                this.commitInlineRename(input.value);
            }, { once: true });
        }, 0);
    }

    getRenameSeed(kind, uid, node) {
        if (kind === 'page') {
            return String(node.name || '').trim();
        }
        if (kind === 'style') {
            return String(node.get('styleName') || node.name || '');
        }
        if (kind === 'script') {
            return String(node.get('scriptName') || node.name || '');
        }
        return '';
    }

    commitInlineRename(nextRaw) {
        if (!this.inlineEdit) {
            return;
        }
        const edit = this.inlineEdit;
        this.inlineEdit = null;
        const next = String(nextRaw || '').trim();
        if (!next) {
            this.refreshTree();
            return;
        }
        this.renameEntry(edit.kind, edit.uid, next);
    }

    cancelInlineRename() {
        if (!this.inlineEdit) {
            return;
        }
        this.inlineEdit = null;
        this.refreshTree();
    }

    normalizeStyleName(name) {
        return String(name || '').replace(/\.css$/i, '').trim();
    }

    normalizeScriptName(name) {
        return String(name || '').replace(/\.js$/i, '').trim();
    }

    ensureLayout(site) {
        const layout = this.getLayout(site);
        this.saveLayout(site, layout);
    }

    getLayout(site) {
        const raw = site.getCustomData('editor.explorer.layout', null);
        const layout = raw && typeof raw === 'object' ? clone(raw) : {};

        layout.folders = layout.folders && typeof layout.folders === 'object' ? layout.folders : {};
        layout.placements = layout.placements && typeof layout.placements === 'object' ? layout.placements : {};
        layout.collapsed = layout.collapsed && typeof layout.collapsed === 'object' ? layout.collapsed : {};
        layout.nextFolderCounter = Number.isInteger(layout.nextFolderCounter) ? layout.nextFolderCounter : 1;

        layout.folders[ROOT_FOLDER_ID] ||= {
            id: ROOT_FOLDER_ID,
            name: 'root',
            parentId: '',
            locked: true,
        };
        layout.folders[CORE_FOLDER_IDS.pages] ||= {
            id: CORE_FOLDER_IDS.pages,
            name: 'pages',
            parentId: ROOT_FOLDER_ID,
            locked: true,
        };
        layout.folders[CORE_FOLDER_IDS.styles] ||= {
            id: CORE_FOLDER_IDS.styles,
            name: 'styles',
            parentId: ROOT_FOLDER_ID,
            locked: true,
        };
        layout.folders[CORE_FOLDER_IDS.scripts] ||= {
            id: CORE_FOLDER_IDS.scripts,
            name: 'scripts',
            parentId: ROOT_FOLDER_ID,
            locked: true,
        };

        layout.folders[ROOT_FOLDER_ID].locked = true;
        layout.folders[CORE_FOLDER_IDS.pages].locked = true;
        layout.folders[CORE_FOLDER_IDS.styles].locked = true;
        layout.folders[CORE_FOLDER_IDS.scripts].locked = true;
        layout.folders[ROOT_FOLDER_ID].parentId = '';
        layout.folders[CORE_FOLDER_IDS.pages].parentId = ROOT_FOLDER_ID;
        layout.folders[CORE_FOLDER_IDS.styles].parentId = ROOT_FOLDER_ID;
        layout.folders[CORE_FOLDER_IDS.scripts].parentId = ROOT_FOLDER_ID;

        return layout;
    }

    saveLayout(site, layout) {
        site.setCustomData('editor.explorer.layout', layout);
    }

    cleanupLayoutForMissingFiles(site) {
        const layout = this.getLayout(site);
        const valid = new Set();
        site.listPages().forEach((page) => valid.add(`page:${page.id}`));
        site.listStylesheets().forEach((name) => valid.add(`style:${name}`));
        const data = site.getDataJSON() || {};
        Object.keys(data.scripts || {}).forEach((name) => valid.add(`script:${name}`));

        Object.keys(layout.placements).forEach((uid) => {
            if (!valid.has(uid)) {
                delete layout.placements[uid];
            }
        });

        this.saveLayout(site, layout);
        this.refreshTree();
    }

    initResize() {
        if (!this.resizeHandle) {
            return;
        }

        this.resizeHandle.addEventListener('pointerdown', (event) => {
            if (!this.panelElement.classList.contains('is-open')) {
                return;
            }

            event.preventDefault();
            this.isResizing = true;
            this.pointerId = event.pointerId;
            this.startPointerX = event.clientX;
            this.startPanelWidth = this.getCurrentPanelWidth();

            this.layoutRoot.classList.add('is-resizing-sidebar');
            if (typeof this.resizeHandle.setPointerCapture === 'function') {
                this.resizeHandle.setPointerCapture(event.pointerId);
            }

            window.addEventListener('pointermove', this.handleResizeMove);
            window.addEventListener('pointerup', this.handleResizeEnd);
            window.addEventListener('pointercancel', this.handleResizeEnd);
            window.addEventListener('blur', this.handleResizeEnd);
        });
    }

    handleResizeMove = (event) => {
        if (!this.isResizing) {
            return;
        }
        if (this.pointerId !== null && event.pointerId !== this.pointerId) {
            return;
        }
        if (event.buttons === 0) {
            this.handleResizeEnd();
            return;
        }

        const delta = event.clientX - this.startPointerX;
        const viewportWidth = Math.max(window.innerWidth, 1);
        const startPanelPx = (this.startPanelWidth / 100) * viewportWidth;
        const minPanelPx = viewportWidth * 0.05;
        const maxPanelPx = viewportWidth * 0.4;
        const nextPanelPx = Math.max(minPanelPx, Math.min(maxPanelPx, startPanelPx + delta));
        const nextPanelVw = (nextPanelPx / viewportWidth) * 100;
        this.layoutRoot.style.setProperty('--editor-panel-width', `${nextPanelVw}vw`);
    };

    handleResizeEnd = (event) => {
        if (!this.isResizing) {
            return;
        }

        if (
            event
            && typeof event.pointerId === 'number'
            && this.pointerId !== null
            && event.pointerId !== this.pointerId
        ) {
            return;
        }

        const pointerId = this.pointerId;
        this.isResizing = false;
        this.pointerId = null;
        this.layoutRoot.classList.remove('is-resizing-sidebar');

        if (typeof this.resizeHandle.releasePointerCapture === 'function') {
            try {
                if (pointerId !== null) {
                    this.resizeHandle.releasePointerCapture(pointerId);
                }
            } catch (_) {
                // Ignore release errors when capture is already gone.
            }
        }

        window.removeEventListener('pointermove', this.handleResizeMove);
        window.removeEventListener('pointerup', this.handleResizeEnd);
        window.removeEventListener('pointercancel', this.handleResizeEnd);
        window.removeEventListener('blur', this.handleResizeEnd);
    };

    getCurrentPanelWidth() {
        const computed = window.getComputedStyle(this.layoutRoot).getPropertyValue('--editor-panel-width').trim();
        if (!computed) {
            return 20;
        }

        const parsed = Number.parseFloat(computed);
        if (!Number.isFinite(parsed)) {
            return 20;
        }

        if (computed.endsWith('vw')) {
            return parsed;
        }

        if (computed.endsWith('px')) {
            const viewportWidth = Math.max(window.innerWidth, 1);
            return (parsed / viewportWidth) * 100;
        }

        return parsed;
    }
}
