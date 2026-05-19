import { deepClone } from '../core/DeepClone.js';
import { DomainPolicy } from '../integration/DomainPolicy.js';

const BODY_NODE_ID = '__body__';

/**
 * Normalize incoming project payload to virtualsite v2 shape.
 * @param {unknown} source - Source project payload.
 * @param {{ tenantId?: string, userId?: string, draft?: Record<string, any> }} [context] - Session context.
 * @returns {object} Normalized project object.
 */
export function normalizeProject(source, context = {}) {
    if (source && typeof source === 'object' && hasV2Shape(source)) {
        return normalizeV2Project(/** @type {Record<string, any>} */ (source), context);
    }

    return normalizeLegacyProject(/** @type {Record<string, any>} */ (source || {}), context);
}

/**
 * Check whether incoming payload already follows v2 structure.
 * @param {unknown} source - Source payload.
 * @returns {boolean} True when source resembles v2 format.
 */
function hasV2Shape(source) {
    if (!source || typeof source !== 'object') {
        return false;
    }

    const raw = /** @type {Record<string, any>} */ (source);
    return Boolean(raw.resources && raw.editor);
}

/**
 * Normalize already-v2 payload and enforce required defaults.
 * @param {Record<string, any>} source - V2 payload.
 * @param {{ tenantId?: string, userId?: string, draft?: Record<string, any> }} context - Session context.
 * @returns {object} Normalized project.
 */
function normalizeV2Project(source, context) {
    const draft = context.draft || {};
    const cloned = deepClone(source);
    cloned.version = 2;
    cloned.tenant ||= {
        tenantId: context.tenantId || String(draft.owner_user_id || 'guest'),
        userId: context.userId || String(draft.owner_user_id || 'guest'),
    };
    cloned.project ||= {};
    cloned.project.id ||= 'proj_01';
    cloned.project.name ||= String(draft.project_name || 'Untitled Project');
    cloned.project.domain = DomainPolicy.parse(cloned.project.domain || draft.subdomain || draft.domain || 'site');
    cloned.resources ||= { pages: { startPageId: null, order: [], byId: {} }, styles: { byId: {} }, scripts: { byId: {} } };
    const pagesById = cloned?.resources?.pages?.byId && typeof cloned.resources.pages.byId === 'object'
        ? cloned.resources.pages.byId
        : {};
    Object.values(pagesById).forEach((page) => {
        if (!page || typeof page !== 'object') {
            return;
        }
        page.includes ||= { styleIds: [], scriptIds: [] };
        page.includes.styleIds = normalizeStringIdList(page.includes.styleIds);
        page.includes.scriptIds = normalizeStringIdList(page.includes.scriptIds);
        page.activeNodeIds = normalizeStringIdList(page.activeNodeIds);
        if (page.activeNodeIds.length === 0 && typeof page.activeNodeId === 'string' && page.activeNodeId.trim()) {
            page.activeNodeIds = [String(page.activeNodeId).trim()];
        }
        page.activeNodeIds = page.activeNodeIds.filter((id) => id !== BODY_NODE_ID);
        page.activeNodeId = page.activeNodeIds[0] || null;
        ensureBodyRootNode(page);
    });
    cloned.editor ||= {};
    cloned.editor.ui ||= {
        leftPanelWidth: 22,
        rightPanelWidth: 20,
        activePanelKey: 'explorer',
        panelOrder: ['explorer', 'siteSetting', 'setting'],
        activeInspectorPanelKey: 'siteSetting',
        viewportModeByPageId: {},
        pageToolMode: 'select',
        deleteMode: 'single',
    };
    cloned.editor.ui.rightPanelWidth = normalizePercent(cloned.editor.ui.rightPanelWidth, 20);
    cloned.editor.ui.pageToolMode = normalizePageToolMode(cloned.editor.ui.pageToolMode);
    cloned.editor.ui.deleteMode = normalizeDeleteMode(cloned.editor.ui.deleteMode);
    cloned.editor.theme ||= {
        activeThemeId: 'default-dark',
        catalog: {},
    };
    cloned.editor.workspaceTree ||= {
        rootId: 'wf_root',
        foldersById: {
            wf_root: { id: 'wf_root', name: 'root', parentId: null, locked: true },
            wf_pages: { id: 'wf_pages', name: 'pages', parentId: 'wf_root', locked: true },
            wf_styles: { id: 'wf_styles', name: 'styles', parentId: 'wf_root', locked: true },
            wf_scripts: { id: 'wf_scripts', name: 'scripts', parentId: 'wf_root', locked: true },
        },
        entriesById: {},
        collapsedFolderIds: [],
    };
    cloned.editor.graph ||= { nodeGraphByNodeId: {} };
    cloned.editor.tabs ||= { activeTabId: null, openTabs: [] };
    return cloned;
}

/**
 * Normalize legacy `pages/stylesheets/scripts` payload into v2 shape.
 * @param {Record<string, any>} legacy - Legacy project payload.
 * @param {{ tenantId?: string, userId?: string, draft?: Record<string, any> }} context - Session context.
 * @returns {object} Normalized v2 project.
 */
function normalizeLegacyProject(legacy, context) {
    const draft = context.draft || {};
    const projectData = legacy.project && typeof legacy.project === 'object' ? legacy.project : {};
    const legacyPages = legacy.pages && typeof legacy.pages === 'object' ? legacy.pages : {};
    const legacyPageData = legacyPages.page_data && typeof legacyPages.page_data === 'object'
        ? legacyPages.page_data
        : {};
    const legacyStylesheets = legacy.stylesheets && typeof legacy.stylesheets === 'object'
        ? legacy.stylesheets
        : {};
    const legacyScripts = legacy.scripts && typeof legacy.scripts === 'object'
        ? legacy.scripts
        : {};

    const styleNameToId = buildNameToIdMap(Object.keys(legacyStylesheets), 'st');
    const scriptNameToId = buildNameToIdMap(Object.keys(legacyScripts), 'sc');

    /** @type {Record<string, any>} */
    const pagesById = {};
    /** @type {string[]} */
    const pageOrder = [];
    Object.entries(legacyPageData).forEach((entry) => {
        const pageId = String(entry[0] || '');
        const page = entry[1] && typeof entry[1] === 'object' ? entry[1] : {};
        const nodeById = page.nodes && typeof page.nodes === 'object' ? deepClone(page.nodes) : {};
        const rootNodeIds = Object.entries(nodeById)
            .filter((nodeEntry) => {
                const node = nodeEntry[1] && typeof nodeEntry[1] === 'object' ? nodeEntry[1] : {};
                const parentId = typeof node.parent === 'string' ? node.parent : null;
                return !parentId || !nodeById[parentId];
            })
            .map((nodeEntry) => String(nodeEntry[0]));

        pagesById[pageId] = {
            id: pageId,
            title: String(page.title || pageId),
            slug: String(page.slug || pageId),
            meta: {
                seoTitle: String(page.title || pageId),
                seoDescription: '',
                visibility: 'public',
            },
            rootNodeIds,
            nodeById,
            includes: {
                styleIds: normalizeLegacyIncludes(page.include?.css, styleNameToId),
                scriptIds: normalizeLegacyIncludes(page.include?.js, scriptNameToId),
            },
            activeNodeId: page.active_node_id ? String(page.active_node_id) : null,
            activeNodeIds: page.active_node_id ? [String(page.active_node_id)] : [],
        };
        ensureBodyRootNode(pagesById[pageId]);
        pageOrder.push(pageId);
    });

    /** @type {Record<string, any>} */
    const stylesById = {};
    Object.entries(legacyStylesheets).forEach((entry) => {
        const legacyName = String(entry[0]);
        const styleId = styleNameToId.get(legacyName);
        if (!styleId) {
            return;
        }
        stylesById[styleId] = {
            id: styleId,
            name: legacyName,
            rules: convertStyleRules(entry[1]),
        };
    });

    /** @type {Record<string, any>} */
    const scriptsById = {};
    Object.entries(legacyScripts).forEach((entry) => {
        const legacyName = String(entry[0]);
        const scriptId = scriptNameToId.get(legacyName);
        if (!scriptId) {
            return;
        }
        const script = entry[1] && typeof entry[1] === 'object' ? entry[1] : {};
        scriptsById[scriptId] = {
            id: scriptId,
            name: legacyName,
            variables: deepClone(script.variables || {}),
            actions: deepClone(script.actions || {}),
            events: deepClone(script.events || {}),
        };
    });

    const startPageId = String(legacyPages.page_start || pageOrder[0] || 'pg_home');
    if (!pagesById[startPageId]) {
        pagesById[startPageId] = {
            id: startPageId,
            title: 'Home',
            slug: 'home',
            meta: {
                seoTitle: 'Home',
                seoDescription: '',
                visibility: 'public',
            },
            rootNodeIds: [],
            nodeById: {},
            includes: {
                styleIds: [],
                scriptIds: [],
            },
            activeNodeId: null,
            activeNodeIds: [],
        };
        ensureBodyRootNode(pagesById[startPageId]);
        pageOrder.unshift(startPageId);
    }

    return {
        version: 2,
        tenant: {
            tenantId: context.tenantId || String(draft.owner_user_id || 'guest'),
            userId: context.userId || String(draft.owner_user_id || 'guest'),
        },
        project: {
            id: String(projectData.id || 'proj_01'),
            name: String(projectData.name || draft.project_name || 'Untitled Project'),
            domain: DomainPolicy.parse(projectData.domain || draft.subdomain || draft.domain || 'site'),
        },
        resources: {
            pages: {
                startPageId,
                order: pageOrder,
                byId: pagesById,
            },
            styles: {
                byId: stylesById,
            },
            scripts: {
                byId: scriptsById,
            },
        },
        editor: {
            theme: {
                activeThemeId: 'default-dark',
                catalog: {},
            },
            workspaceTree: {
                rootId: 'wf_root',
                foldersById: {
                    wf_root: { id: 'wf_root', name: 'root', parentId: null, locked: true },
                    wf_pages: { id: 'wf_pages', name: 'pages', parentId: 'wf_root', locked: true },
                    wf_styles: { id: 'wf_styles', name: 'styles', parentId: 'wf_root', locked: true },
                    wf_scripts: { id: 'wf_scripts', name: 'scripts', parentId: 'wf_root', locked: true },
                },
                entriesById: {},
                collapsedFolderIds: [],
            },
            graph: { nodeGraphByNodeId: {} },
            tabs: { activeTabId: null, openTabs: [] },
            ui: {
                leftPanelWidth: 22,
                rightPanelWidth: 20,
                activePanelKey: 'explorer',
                panelOrder: ['explorer', 'siteSetting', 'setting'],
                activeInspectorPanelKey: 'siteSetting',
                viewportModeByPageId: {},
                pageToolMode: 'select',
                deleteMode: 'single',
            },
        },
    };
}

/**
 * Build deterministic name->id map.
 * @param {string[]} names - Source names.
 * @param {string} prefix - Id prefix.
 * @returns {Map<string, string>} Name to id map.
 */
function buildNameToIdMap(names, prefix) {
    const map = new Map();
    const used = new Set();
    names.forEach((name) => {
        const seed = `${prefix}_${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item'}`;
        let candidate = seed;
        let index = 2;
        while (used.has(candidate)) {
            candidate = `${seed}_${index}`;
            index += 1;
        }
        used.add(candidate);
        map.set(name, candidate);
    });
    return map;
}

/**
 * Convert legacy include names into stable ids.
 * @param {unknown} includeNames - Legacy names list.
 * @param {Map<string, string>} idMap - Name-id map.
 * @returns {string[]} Stable id list.
 */
function normalizeLegacyIncludes(includeNames, idMap) {
    if (!Array.isArray(includeNames)) {
        return [];
    }

    return includeNames
        .map((name) => {
            const raw = String(name || '').trim();
            const stripped = raw.replace(/\.(css|js)$/i, '');
            return idMap.get(stripped) || idMap.get(raw);
        })
        .filter(Boolean);
}

/**
 * Convert old stylesheet object/string into rule list.
 * @param {unknown} source - Legacy stylesheet value.
 * @returns {Array<{ selector: string, declarations: Record<string, string> }>} Style rule array.
 */
function convertStyleRules(source) {
    if (!source || typeof source !== 'object') {
        return [];
    }

    /** @type {Array<{ selector: string, declarations: Record<string, string> }>} */
    const rules = [];
    Object.entries(/** @type {Record<string, any>} */ (source)).forEach((entry) => {
        const selector = String(entry[0] || '').trim();
        const declarationObj = entry[1] && typeof entry[1] === 'object' ? entry[1] : {};
        if (!selector) {
            return;
        }
        /** @type {Record<string, string>} */
        const declarations = {};
        Object.entries(declarationObj).forEach((ruleEntry) => {
            declarations[String(ruleEntry[0])] = String(ruleEntry[1]);
        });
        rules.push({ selector, declarations });
    });
    return rules;
}

/**
 * Normalize arbitrary id list to unique string array.
 * @param {unknown} source - Raw list input.
 * @returns {string[]} Unique normalized id list.
 */
function normalizeStringIdList(source) {
    if (!Array.isArray(source)) {
        return [];
    }

    return Array.from(new Set(source
        .map((value) => String(value || '').trim())
        .filter(Boolean)));
}

/**
 * Ensure virtual body root node exists and mirrors top-level roots.
 * @param {any} page - Page object.
 * @returns {void}
 */
function ensureBodyRootNode(page) {
    if (!page || typeof page !== 'object') {
        return;
    }

    page.rootNodeIds = Array.isArray(page.rootNodeIds) ? page.rootNodeIds : [];
    page.nodeById = page.nodeById && typeof page.nodeById === 'object' ? page.nodeById : {};
    const bodyNode = page.nodeById[BODY_NODE_ID] && typeof page.nodeById[BODY_NODE_ID] === 'object'
        ? page.nodeById[BODY_NODE_ID]
        : {};

    page.nodeById[BODY_NODE_ID] = {
        ...bodyNode,
        tag: 'body',
        parent: null,
        attrs: bodyNode.attrs && typeof bodyNode.attrs === 'object' ? bodyNode.attrs : {},
        text: '',
        children: page.rootNodeIds.filter((id) => id !== BODY_NODE_ID),
        _virtualRoot: true,
    };
}

/**
 * Normalize percentage-like UI width values.
 * @param {unknown} value - Candidate percent.
 * @param {number} fallback - Fallback percent.
 * @returns {number} Normalized percent value.
 */
function normalizePercent(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return fallback;
    }
    return numeric;
}

/**
 * Normalize page tool mode enum.
 * @param {unknown} value - Candidate mode.
 * @returns {'select' | 'add' | 'delete'} Normalized page tool mode.
 */
function normalizePageToolMode(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'add' || raw === 'delete') {
        return raw;
    }
    return 'select';
}

/**
 * Normalize delete mode enum.
 * @param {unknown} value - Candidate delete mode.
 * @returns {'single' | 'branch'} Normalized delete mode.
 */
function normalizeDeleteMode(value) {
    return String(value || '').trim().toLowerCase() === 'branch' ? 'branch' : 'single';
}
