import { BUS } from './constants.js';

export class SaveService {
    constructor(options) {
        this.bus = options.bus;
        this.runtime = options.runtime;
        this.saveButton = options.saveButton;
        this.saveStatus = options.saveStatus;
        this.urlPreview = options.urlPreview;
        this.draft = window.creatorDraft || {};
    }

    init() {
        this.renderUrlPreview();
        this.setStatus('Idle.', false);

        if (this.saveButton) {
            this.saveButton.addEventListener('click', () => {
                this.saveProject();
            });
        }
    }

    renderUrlPreview() {
        if (!this.urlPreview) {
            return;
        }

        const domain = String(this.draft.domain || `${this.draft.subdomain || 'site'}.idol1st.app`);
        const path = String(this.draft.project_path || 'home').replace(/^\/+/, '');
        this.urlPreview.textContent = `${domain}/${path}`;
    }

    setStatus(message, isError) {
        if (this.saveStatus) {
            this.saveStatus.textContent = message;
            this.saveStatus.classList.toggle('is-error', Boolean(isError));
        }

        this.bus.emit(BUS.SAVE_STATUS, { message: message, isError: Boolean(isError) });
    }

    async saveProject() {
        const site = this.runtime.getSite();
        if (!site || typeof site.getDataJSON !== 'function') {
            this.setStatus('Builder is still loading. Please wait.', true);
            return;
        }

        const saveUrl = window.creatorSaveUrl;
        if (!saveUrl) {
            this.setStatus('Save URL is missing.', true);
            return;
        }

        const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const payload = { project_json: site.getDataJSON() };

        if (this.saveButton) {
            this.saveButton.disabled = true;
        }
        this.setStatus('Saving project...', false);

        try {
            const response = await fetch(saveUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(function() {
                return {};
            });

            if (!response.ok || !data.ok) {
                throw new Error(data.message || 'Save failed.');
            }

            this.setStatus(data.message || 'Project saved.', false);
        } catch (error) {
            this.setStatus(error && error.message ? error.message : 'Save failed.', true);
        } finally {
            if (this.saveButton) {
                this.saveButton.disabled = false;
            }
        }
    }
}
