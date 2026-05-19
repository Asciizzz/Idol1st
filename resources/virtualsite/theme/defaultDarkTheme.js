/**
 * Built-in default dark theme definition.
 * @type {{ id: string, name: string, kind: "builtin", tokens: Record<string, string> }}
 */
export const defaultDarkTheme = {
    id: 'default-dark',
    name: 'Default Dark',
    kind: 'builtin',
    tokens: {
        'editor.background': '#111215',
        'editor.foreground': '#e4e7ec',
        'panel.background': '#181a1f',
        'panel.border': '#2a2f3a',
        'tab.activeBackground': '#1f2430',
        'tab.inactiveBackground': '#171b24',
        'statusbar.background': '#0f1115',
        'accent.primary': '#4f7cff',
    },
};

