import { deepClone } from '../core/DeepClone.js';
import { ThemeValidator } from './ThemeValidator.js';

/**
 * Theme catalog and active-theme manager.
 */
export class ThemeRegistry {
    /**
     * Create a theme registry.
     * @param {{ builtins: Array<{ id: string, name: string, kind: "builtin", tokens: Record<string, string> }>, activeThemeId?: string }} options - Registry options.
     */
    constructor(options) {
        /** @type {Map<string, { id: string, name: string, kind: "builtin" | "custom", tokens: Record<string, string> }>} */
        this.catalog = new Map();
        /** @type {Set<string>} */
        this.builtinIds = new Set();
        /** @type {string} */
        this.activeThemeId = 'default-dark';

        (options?.builtins || []).forEach((theme) => {
            this.registerBuiltinTheme(theme);
        });

        if (options?.activeThemeId && this.catalog.has(options.activeThemeId)) {
            this.activeThemeId = options.activeThemeId;
        } else if (this.catalog.has('default-dark')) {
            this.activeThemeId = 'default-dark';
        } else {
            const firstId = this.catalog.keys().next().value;
            this.activeThemeId = firstId || '';
        }
    }

    /**
     * Register a built-in theme.
     * @param {{ id: string, name: string, kind: "builtin", tokens: Record<string, string> }} theme - Built-in theme.
     * @returns {void}
     */
    registerBuiltinTheme(theme) {
        const result = ThemeValidator.validate(theme);
        if (!result.ok || !result.value) {
            return;
        }

        const normalized = { ...result.value, kind: 'builtin' };
        this.catalog.set(normalized.id, normalized);
        this.builtinIds.add(normalized.id);
    }

    /**
     * Register a custom theme object.
     * @param {unknown} themeCandidate - Custom theme candidate.
     * @returns {{ ok: boolean, errors: string[], themeId: string | null }}
     */
    registerCustomTheme(themeCandidate) {
        const result = ThemeValidator.validate(themeCandidate);
        if (!result.ok || !result.value) {
            return { ok: false, errors: result.errors, themeId: null };
        }

        const theme = { ...result.value, kind: 'custom' };
        this.catalog.set(theme.id, theme);
        return { ok: true, errors: [], themeId: theme.id };
    }

    /**
     * Remove a custom theme.
     * @param {string} themeId - Theme id.
     * @returns {{ ok: boolean, reason: string | null }}
     */
    removeTheme(themeId) {
        if (!this.catalog.has(themeId)) {
            return { ok: false, reason: 'Theme does not exist.' };
        }
        if (this.builtinIds.has(themeId)) {
            return { ok: false, reason: 'Built-in themes cannot be deleted.' };
        }

        this.catalog.delete(themeId);
        if (this.activeThemeId === themeId) {
            this.activeThemeId = this.catalog.has('default-dark')
                ? 'default-dark'
                : (this.catalog.keys().next().value || '');
        }
        return { ok: true, reason: null };
    }

    /**
     * Set active theme id.
     * @param {string} themeId - Theme id.
     * @returns {boolean} True when theme exists and is now active.
     */
    setActiveTheme(themeId) {
        if (!this.catalog.has(themeId)) {
            return false;
        }
        this.activeThemeId = themeId;
        return true;
    }

    /**
     * Read active theme object.
     * @returns {{ id: string, name: string, kind: "builtin" | "custom", tokens: Record<string, string> } | null} Active theme.
     */
    getActiveTheme() {
        return deepClone(this.catalog.get(this.activeThemeId) || null);
    }

    /**
     * Read theme by id.
     * @param {string} themeId - Theme id.
     * @returns {{ id: string, name: string, kind: "builtin" | "custom", tokens: Record<string, string> } | null} Theme object.
     */
    getTheme(themeId) {
        return deepClone(this.catalog.get(themeId) || null);
    }

    /**
     * Read all themes as array.
     * @returns {Array<{ id: string, name: string, kind: "builtin" | "custom", tokens: Record<string, string> }>} Theme list.
     */
    listThemes() {
        return Array.from(this.catalog.values()).map((theme) => deepClone(theme));
    }

    /**
     * Export theme catalog and active id for persistence.
     * @returns {{ activeThemeId: string, catalog: Record<string, { id: string, name: string, kind: "builtin" | "custom", tokens: Record<string, string> }> }} Serializable theme state.
     */
    exportState() {
        /** @type {Record<string, { id: string, name: string, kind: "builtin" | "custom", tokens: Record<string, string> }>} */
        const catalog = {};
        this.catalog.forEach((value, key) => {
            catalog[key] = deepClone(value);
        });

        return {
            activeThemeId: this.activeThemeId,
            catalog,
        };
    }
}

