import { BUS } from './constants.js';
import { escapeHTML } from './utils.js';

export class RenderGraph {
    constructor(options) {
        this.bus = options.bus;
        this.runtime = options.runtime;
        this.pageId = options.pageId;
        this.element = document.createElement('div');
        this.element.className = 'render-graph';
        this.unsubscribers = [];
    }

    mount(parent) {
        parent.appendChild(this.element);
        this.render();

        this.unsubscribers.push(
            this.bus.on(BUS.PAGES_CHANGED, () => this.render()),
            this.bus.on(BUS.PAGE_CONTENT_CHANGED, () => this.render()),
            this.bus.on(BUS.PAGE_SELECTED, () => this.render())
        );
    }

    setPage(pageId) {
        this.pageId = pageId;
        this.render();
    }

    render() {
        const site = this.runtime.getSite();
        const page = site ? site.getPageData(this.pageId) : null;

        if (!page) {
            this.element.innerHTML = '<div class="render-graph-empty">Page not found.</div>';
            return;
        }

        const nodes = page.nodes && typeof page.nodes === 'object' ? page.nodes : {};
        const nodeIds = Object.keys(nodes);
        if (nodeIds.length === 0) {
            this.element.innerHTML = '<div class="render-graph-empty">No nodes on this page yet.</div>';
            return;
        }

        const root = this.buildTree(nodes);
        this.element.replaceChildren(root);
    }

    buildTree(nodes) {
        const childrenMap = new Map();

        Object.entries(nodes).forEach(function(entry) {
            const nodeId = entry[0];
            const node = entry[1];
            const parent = typeof node.parent === 'string' && node.parent && nodes[node.parent]
                ? node.parent
                : null;

            if (!childrenMap.has(parent)) {
                childrenMap.set(parent, []);
            }

            childrenMap.get(parent).push(nodeId);
        });

        const tree = document.createElement('div');
        tree.className = 'render-graph-tree';

        const buildBranch = function(nodeId) {
            const node = nodes[nodeId];
            if (!node) {
                return null;
            }

            const item = document.createElement('div');
            item.className = 'render-graph-item';

            const label = document.createElement('div');
            label.className = 'render-graph-label';
            const text = typeof node.text === 'string' ? node.text.trim() : '';
            label.innerHTML = `<strong>&lt;${escapeHTML(node.tag || 'div')}&gt;</strong> <span>${escapeHTML(text || 'empty')}</span>`;

            const children = document.createElement('div');
            children.className = 'render-graph-children';

            (childrenMap.get(nodeId) || []).forEach(function(childId) {
                const child = buildBranch(childId);
                if (child) {
                    children.appendChild(child);
                }
            });

            item.append(label, children);
            return item;
        };

        (childrenMap.get(null) || []).forEach(function(rootId) {
            const branch = buildBranch(rootId);
            if (branch) {
                tree.appendChild(branch);
            }
        });

        return tree;
    }

    destroy() {
        this.unsubscribers.forEach(function(unsubscribe) {
            unsubscribe();
        });
        this.unsubscribers = [];
        this.element.remove();
    }
}
