/**
 * Save API client for builder project persistence.
 */
export class SaveClient {
    /**
     * Create save client.
     * @param {{ saveUrl: string, csrfToken?: string }} options - Save options.
     */
    constructor(options) {
        /** @type {string} */
        this.saveUrl = String(options.saveUrl || '').trim();
        /** @type {string} */
        this.csrfToken = String(options.csrfToken || '').trim();
    }

    /**
     * Save project payload.
     * @param {object} projectJson - Project payload.
     * @returns {Promise<{ ok: boolean, message: string }>} Save result.
     */
    async save(projectJson) {
        if (!this.saveUrl) {
            return { ok: false, message: 'Save URL is missing.' };
        }

        try {
            const response = await fetch(this.saveUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': this.csrfToken,
                },
                body: JSON.stringify({
                    project_json: projectJson,
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.ok) {
                return { ok: false, message: String(data.message || `Save failed (${response.status})`) };
            }

            return { ok: true, message: String(data.message || 'Saved.') };
        } catch (error) {
            return {
                ok: false,
                message: error instanceof Error ? error.message : 'Save failed.',
            };
        }
    }
}

