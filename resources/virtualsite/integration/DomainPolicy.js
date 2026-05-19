/**
 * Domain normalization and validation policy for `.idolist`.
 */
export class DomainPolicy {
    /**
     * Normalize domain label input.
     * @param {string} label - Raw label.
     * @returns {string} Normalized label.
     */
    static normalizeLabel(label) {
        const normalized = String(label || '')
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');

        return normalized || 'site';
    }

    /**
     * Validate domain label.
     * @param {string} label - Domain label.
     * @returns {{ ok: boolean, message: string | null }} Validation result.
     */
    static validateLabel(label) {
        const value = String(label || '').trim().toLowerCase();
        if (!value) {
            return { ok: false, message: 'Domain label is required.' };
        }

        if (!/^[a-z0-9-]+$/.test(value)) {
            return { ok: false, message: 'Domain label can only use letters, numbers, and hyphen.' };
        }

        if (value.startsWith('-') || value.endsWith('-')) {
            return { ok: false, message: 'Domain label cannot start or end with hyphen.' };
        }

        return { ok: true, message: null };
    }

    /**
     * Build a domain object with enforced suffix.
     * @param {string} label - Domain label.
     * @returns {{ label: string, suffix: string, fqdn: string }} Domain object.
     */
    static buildDomain(label) {
        const normalizedLabel = DomainPolicy.normalizeLabel(label);
        const suffix = 'idolist';

        return {
            label: normalizedLabel,
            suffix,
            fqdn: `${normalizedLabel}.${suffix}`,
        };
    }

    /**
     * Parse existing domain string/object into enforced domain object.
     * @param {unknown} source - Domain source.
     * @returns {{ label: string, suffix: string, fqdn: string }} Normalized domain object.
     */
    static parse(source) {
        if (source && typeof source === 'object') {
            const raw = /** @type {Record<string, any>} */ (source);
            return DomainPolicy.buildDomain(raw.label || raw.fqdn || '');
        }

        const rawText = String(source || '').trim().toLowerCase();
        if (!rawText) {
            return DomainPolicy.buildDomain('site');
        }

        const [label] = rawText.split('.');
        return DomainPolicy.buildDomain(label || 'site');
    }
}

