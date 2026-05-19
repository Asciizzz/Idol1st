/**
 * Required theme token keys.
 * @type {string[]}
 */
export const REQUIRED_THEME_TOKENS = [
    'editor.background',
    'editor.foreground',
    'panel.background',
    'panel.border',
    'tab.activeBackground',
    'tab.inactiveBackground',
    'statusbar.background',
    'accent.primary',
];

/**
 * Convert token key into css variable key.
 * @param {string} tokenKey - Theme token key.
 * @returns {string} CSS custom property key.
 */
export function tokenToCssVar(tokenKey) {
    return `--vsb-${String(tokenKey).replace(/\./g, '-')}`;
}

