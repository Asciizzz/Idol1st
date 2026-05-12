export const BUS = {
    READY: 'editor:ready',
    PAGES_CHANGED: 'editor:pages-changed',
    PAGE_SELECTED: 'editor:page-selected',
    PAGE_CONTENT_CHANGED: 'editor:page-content-changed',
    STYLES_CHANGED: 'editor:styles-changed',
    SCRIPTS_CHANGED: 'editor:scripts-changed',
    TAB_OPENED: 'editor:tab-opened',
    TAB_CLOSED: 'editor:tab-closed',
    TAB_ACTIVATED: 'editor:tab-activated',
    PAGE_MODE_CHANGED: 'editor:page-mode-changed',
    SAVE_STATUS: 'editor:save-status',
};

export const TAB_KIND = {
    PAGE: 'page',
    STYLE: 'style',
    SCRIPT: 'script',
};

export const DND_TYPE_NODE_ID = 'application/x-ezvs-node-id';
