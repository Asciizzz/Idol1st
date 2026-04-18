import '../css/global.css';
import '../css/editor.css';
import './webconstruct/editor.js';
import './webconstruct/sidebar.js';
import './webconstruct/global/EzTooltip.js';

const draft = window.creatorDraft || {};
const saveButton = document.querySelector('#save-builder');
const saveStatus = document.querySelector('#builder-save-status');
const urlPreview = document.querySelector('#builder-url-preview');

if (urlPreview) {
    const domain = String(draft.domain || `${draft.subdomain || 'site'}.idol1st.app`);
    const path = String(draft.project_path || 'home').replace(/^\/+/, '');
    urlPreview.textContent = `${domain}/${path}`;
}

function setStatus(message, isError) {
    if (!saveStatus) {
        return;
    }

    saveStatus.textContent = message;
    saveStatus.classList.toggle('is-error', Boolean(isError));
}

async function saveBuilderProject() {
    if (!window.WebConstruct || typeof window.WebConstruct.getProjectJSON !== 'function') {
        setStatus('Builder is still loading. Please wait a moment.', true);
        return;
    }

    const saveUrl = window.creatorSaveUrl;
    if (!saveUrl) {
        setStatus('Save URL is missing.', true);
        return;
    }

    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const payload = {
        project_json: window.WebConstruct.getProjectJSON()
    };

    if (saveButton) {
        saveButton.disabled = true;
    }
    setStatus('Saving builder draft...', false);

    try {
        const response = await fetch(saveUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrf
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(function() {
            return {};
        });

        if (!response.ok || !data.ok) {
            throw new Error(data.message || 'Save failed.');
        }

        setStatus(data.message || 'Builder draft saved.', false);
    } catch (error) {
        setStatus(error && error.message ? error.message : 'Save failed.', true);
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
        }
    }
}

if (saveButton) {
    saveButton.addEventListener('click', saveBuilderProject);
}

document.addEventListener('wc:project-ready', function() {
    setStatus('Builder ready.', false);
});
