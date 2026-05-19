import './styles/workbench.css';
import { VirtualSiteBuilder } from './bootstrap/VirtualSiteBuilder.js';

/**
 * Resolve builder host element for drop-and-use mount.
 * @returns {HTMLElement} Host element.
 */
function resolveHost() {
    const explicitHost = document.querySelector('#virtualsite-host');
    if (explicitHost instanceof HTMLElement) {
        return explicitHost;
    }

    const fallbackHost = document.querySelector('#editor-app');
    if (fallbackHost instanceof HTMLElement) {
        return fallbackHost;
    }

    const generatedHost = document.createElement('div');
    generatedHost.id = 'virtualsite-host';
    document.body.appendChild(generatedHost);
    return generatedHost;
}

/**
 * Bootstrap builder runtime.
 * @returns {Promise<void>}
 */
async function bootstrap() {
    const host = resolveHost();
    const draft = window.creatorDraft || {};

    const builder = await VirtualSiteBuilder.mount({
        host,
        projectData: window.webConstructInitialProject || {},
        session: {
            tenantId: String(draft.owner_user_id || 'guest'),
            userId: String(draft.owner_user_id || 'guest'),
        },
        saveUrl: String(window.creatorSaveUrl || ''),
        theme: {
            initialThemeId: 'default-dark',
            catalog: [],
        },
    });

    window.virtualSiteBuilder = builder;
}

bootstrap().catch((error) => {
    const host = resolveHost();
    host.textContent = `VirtualSite builder failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`;
});

