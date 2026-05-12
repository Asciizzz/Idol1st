export const ADD_MENU_SCHEMA = {
    title: 'Add',
    items: [
        { type: 'group', label: 'General' },
        {
            type: 'submenu',
            label: 'Layout',
            items: [
                { type: 'action', label: 'Div', actionId: 'add.div', payload: { tag: 'div' } },
                { type: 'action', label: 'Section', actionId: 'add.section', payload: { tag: 'section' } },
                { type: 'action', label: 'Article', actionId: 'add.article', payload: { tag: 'article' } },
            ],
        },
        { type: 'action', label: 'Div', actionId: 'add.div', payload: { tag: 'div' } },
        { type: 'action', label: 'Paragraph', actionId: 'add.p', payload: { tag: 'p', text: 'Paragraph' } },
        { type: 'separator' },
        { type: 'group', label: 'Find' },
        { type: 'search', label: 'Search...' },
    ],
};

function isActionItem(item) {
    return item && item.type === 'action' && typeof item.actionId === 'string' && item.actionId.length > 0;
}

export function findMenuByPath(schema, path = []) {
    if (!schema || !Array.isArray(schema.items)) {
        return null;
    }

    let current = schema;
    for (const index of path) {
        if (!current || !Array.isArray(current.items)) {
            return null;
        }
        const next = current.items[index];
        if (!next || next.type !== 'submenu' || !Array.isArray(next.items)) {
            return null;
        }
        current = next;
    }
    return current;
}

export function flattenActionItems(schema) {
    const output = [];

    function visit(menu, chain = []) {
        if (!menu || !Array.isArray(menu.items)) {
            return;
        }

        menu.items.forEach((item) => {
            if (!item || typeof item !== 'object') {
                return;
            }

            if (isActionItem(item)) {
                output.push({
                    actionId: item.actionId,
                    label: String(item.label || item.actionId),
                    payload: item.payload || {},
                    chain: chain.slice(),
                });
                return;
            }

            if (item.type === 'submenu') {
                visit(item, chain.concat(String(item.label || '')));
            }
        });
    }

    visit(schema, []);
    return output;
}

export function filterActionsByQuery(schema, query) {
    const normalized = String(query || '').trim().toLowerCase();
    if (!normalized) {
        return flattenActionItems(schema);
    }

    return flattenActionItems(schema).filter((item) => {
        const label = String(item.label || '').toLowerCase();
        const action = String(item.actionId || '').toLowerCase();
        return label.includes(normalized) || action.includes(normalized);
    });
}

export function normalizeActiveNodeId(nodeId, nodes = {}) {
    if (nodeId === null || nodeId === undefined || nodeId === '') {
        return null;
    }
    const next = String(nodeId);
    return Object.prototype.hasOwnProperty.call(nodes || {}, next) ? next : null;
}
