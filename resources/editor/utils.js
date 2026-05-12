export function escapeHTML(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

export function uniqueName(seed, existingNames) {
    const used = new Set(existingNames || []);
    if (!used.has(seed)) {
        return seed;
    }

    let index = 2;
    while (used.has(`${seed}-${index}`)) {
        index += 1;
    }

    return `${seed}-${index}`;
}

export function cssObjectToText(stylesheet) {
    if (typeof stylesheet === 'string') {
        return stylesheet;
    }

    if (!stylesheet || typeof stylesheet !== 'object') {
        return '';
    }

    return Object.entries(stylesheet)
        .map(function(entry) {
            const selector = entry[0];
            const rules = entry[1];
            if (!rules || typeof rules !== 'object') {
                return '';
            }

            const body = Object.entries(rules)
                .map(function(ruleEntry) {
                    const property = String(ruleEntry[0]).replace(/[A-Z]/g, function(char) {
                        return `-${char.toLowerCase()}`;
                    });
                    return `${property}: ${ruleEntry[1]};`;
                })
                .join('\n  ');

            return `${selector} {\n  ${body}\n}`;
        })
        .filter(Boolean)
        .join('\n\n');
}

export function cssTextToObject(cssText) {
    if (typeof cssText !== 'string' || !cssText.trim()) {
        return {};
    }

    const output = {};
    const blocks = cssText.split('}');

    blocks.forEach(function(block) {
        const parts = block.split('{');
        if (parts.length < 2) {
            return;
        }

        const selector = (parts[0] || '').trim();
        const body = (parts[1] || '').trim();
        if (!selector || !body) {
            return;
        }

        const rules = {};
        body.split(';').forEach(function(line) {
            const rule = line.trim();
            if (!rule) {
                return;
            }

            const ruleParts = rule.split(':');
            if (ruleParts.length < 2) {
                return;
            }

            const property = (ruleParts.shift() || '').trim();
            const value = ruleParts.join(':').trim();
            if (!property || !value) {
                return;
            }

            rules[property] = value;
        });

        if (Object.keys(rules).length > 0) {
            output[selector] = rules;
        }
    });

    return output;
}
