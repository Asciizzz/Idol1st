import { REQUIRED_THEME_TOKENS } from './ThemeTokens.js';

/**
 * Validate theme payload objects.
 */
export class ThemeValidator {
    /**
     * Validate a candidate theme object.
     * @param {unknown} candidate - Theme payload.
     * @returns {{ ok: boolean, errors: string[], value: null | { id: string, name: string, kind: "builtin" | "custom", tokens: Record<string, string> } }}
     */
    static validate(candidate) {
        /** @type {string[]} */
        const errors = [];
        if (!candidate || typeof candidate !== 'object') {
            return { ok: false, errors: ['Theme must be an object.'], value: null };
        }

        const raw = /** @type {Record<string, any>} */ (candidate);
        const id = String(raw.id || '').trim();
        const name = String(raw.name || '').trim();
        const kind = String(raw.kind || 'custom').trim();
        const tokens = raw.tokens;

        if (!id) {
            errors.push('Theme id is required.');
        }
        if (!/^[a-z0-9-]+$/i.test(id)) {
            errors.push('Theme id can only use letters, numbers, and hyphen.');
        }
        if (!name) {
            errors.push('Theme name is required.');
        }
        if (kind !== 'builtin' && kind !== 'custom') {
            errors.push('Theme kind must be "builtin" or "custom".');
        }
        if (!tokens || typeof tokens !== 'object') {
            errors.push('Theme tokens must be an object.');
        }

        /** @type {Record<string, string>} */
        const normalizedTokens = {};
        if (tokens && typeof tokens === 'object') {
            Object.entries(tokens).forEach((entry) => {
                const key = String(entry[0] || '').trim();
                const value = String(entry[1] || '').trim();
                if (!key) {
                    return;
                }
                normalizedTokens[key] = value;
            });
        }

        REQUIRED_THEME_TOKENS.forEach((tokenKey) => {
            const value = String(normalizedTokens[tokenKey] || '').trim();
            if (!value) {
                errors.push(`Missing required token "${tokenKey}".`);
            }
        });

        if (errors.length > 0) {
            return { ok: false, errors, value: null };
        }

        return {
            ok: true,
            errors: [],
            value: {
                id,
                name,
                kind: kind === 'builtin' ? 'builtin' : 'custom',
                tokens: normalizedTokens,
            },
        };
    }

    /**
     * Parse JSON text and validate as theme object.
     * @param {string} jsonText - Raw JSON text.
     * @returns {{ ok: boolean, errors: string[], value: null | { id: string, name: string, kind: "builtin" | "custom", tokens: Record<string, string> } }}
     */
    static parseAndValidate(jsonText) {
        try {
            const parsed = JSON.parse(String(jsonText || ''));
            return ThemeValidator.validate(parsed);
        } catch (_) {
            return { ok: false, errors: ['Invalid JSON.'], value: null };
        }
    }
}

