import { REQUIRED_THEME_TOKENS, tokenToCssVar } from './ThemeTokens.js';

/**
 * Apply tokenized theme values to the editor root.
 */
export class ThemeApplier {
    /**
     * Apply theme tokens to root style variables.
     * @param {HTMLElement} rootElement - Root editor element.
     * @param {{ id: string, name: string, kind: "builtin" | "custom", tokens: Record<string, string> } | null} activeTheme - Active theme.
     * @param {{ id: string, name: string, kind: "builtin" | "custom", tokens: Record<string, string> } | null} fallbackTheme - Fallback theme.
     * @returns {void}
     */
    static apply(rootElement, activeTheme, fallbackTheme) {
        if (!(rootElement instanceof HTMLElement)) {
            return;
        }

        const activeTokens = activeTheme?.tokens || {};
        const fallbackTokens = fallbackTheme?.tokens || {};

        REQUIRED_THEME_TOKENS.forEach((tokenKey) => {
            const value = String(activeTokens[tokenKey] || fallbackTokens[tokenKey] || '').trim();
            if (!value) {
                return;
            }
            rootElement.style.setProperty(tokenToCssVar(tokenKey), value);
        });

        if (activeTheme?.id) {
            rootElement.dataset.themeId = activeTheme.id;
        }
    }
}

