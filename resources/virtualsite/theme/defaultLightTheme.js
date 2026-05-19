/**
 * Built-in default light theme definition.
 * @type {{ id: string, name: string, kind: "builtin", tokens: Record<string, string> }}
 */
export const defaultLightTheme = {
    id: 'default-light',
    name: 'Default Light',
    kind: 'builtin',
    tokens: {
        'editor.background': '#f3f5f9',
        'editor.foreground': '#1c2430',
        'panel.background': '#ffffff',
        'panel.border': '#d6dbe6',
        'tab.activeBackground': '#ffffff',
        'tab.inactiveBackground': '#e8edf6',
        'statusbar.background': '#dde3ef',
        'accent.primary': '#3056d8',
    },
};

