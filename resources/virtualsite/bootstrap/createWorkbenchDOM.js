/**
 * Create full workbench DOM inside a host element.
 * @param {HTMLElement} host - Mount host element.
 * @returns {{
 *   root: HTMLElement,
 *   saveButton: HTMLButtonElement,
 *   saveStatus: HTMLElement,
 *   domainPreview: HTMLElement,
 *   sidePanelNav: HTMLElement,
 *   sidePanelResizer: HTMLElement,
 *   sidePanelTitle: HTMLElement,
 *   sidePanelContainer: HTMLElement,
 *   tabs: HTMLElement,
 *   stageHeader: HTMLElement,
 *   stageHeaderTitle: HTMLElement,
 *   stageHeaderActions: HTMLElement,
 *   toolRail: HTMLElement,
 *   inspectorResizer: HTMLElement,
 *   inspectorPanel: HTMLElement,
 *   inspectorTitle: HTMLElement,
 *   inspectorContent: HTMLElement,
 *   iframeHost: HTMLElement,
 *   auxHost: HTMLElement
 * }} Element references.
 */
export function createWorkbenchDOM(host) {
    host.replaceChildren();

    const root = document.createElement('section');
    root.className = 'vsb-root';

    const header = document.createElement('header');
    header.className = 'vsb-header';
    header.innerHTML = `
        <div class="vsb-header-left">
            <span class="vsb-header-kicker">Live Builder</span>
            <strong class="vsb-header-title">VirtualSite Editor</strong>
            <span class="vsb-header-domain" data-role="domain-preview"></span>
        </div>
        <div class="vsb-header-right">
            <button class="vsb-btn vsb-btn-primary" type="button" data-role="save-project">Save</button>
        </div>
    `;

    const body = document.createElement('div');
    body.className = 'vsb-body';

    const sidePanelNav = document.createElement('nav');
    sidePanelNav.className = 'vsb-side-nav';
    sidePanelNav.setAttribute('aria-label', 'Builder Sections');

    const sidePanel = document.createElement('aside');
    sidePanel.className = 'vsb-side-panel';
    sidePanel.innerHTML = `
        <div class="vsb-side-panel-header" data-role="side-panel-title">Explorer</div>
        <div class="vsb-side-panel-content" data-role="side-panel-content"></div>
    `;

    const sidePanelResizer = document.createElement('div');
    sidePanelResizer.className = 'vsb-side-resizer';
    sidePanelResizer.setAttribute('role', 'separator');
    sidePanelResizer.setAttribute('aria-orientation', 'vertical');
    sidePanelResizer.setAttribute('aria-label', 'Resize side panel');

    const main = document.createElement('main');
    main.className = 'vsb-main';

    const tabs = document.createElement('div');
    tabs.className = 'vsb-tabs';
    tabs.setAttribute('aria-label', 'VirtualSite Tabs');

    const workspace = document.createElement('div');
    workspace.className = 'vsb-workspace';

    const stage = document.createElement('section');
    stage.className = 'vsb-stage';

    const stageBody = document.createElement('div');
    stageBody.className = 'vsb-stage-body';

    const iframeHost = document.createElement('div');
    iframeHost.className = 'vsb-iframe-host';

    const auxHost = document.createElement('div');
    auxHost.className = 'vsb-aux-host';

    stageBody.append(iframeHost, auxHost);
    stage.append(stageBody);

    workspace.append(stage);
    main.append(tabs, workspace);
    body.append(sidePanelNav, sidePanel, sidePanelResizer, main);

    const status = document.createElement('footer');
    status.className = 'vsb-status';
    status.innerHTML = `
        <span class="vsb-status-chip">Ready</span>
        <span class="vsb-status-chip" data-role="save-status">Idle.</span>
    `;

    const stageHeader = document.createElement('div');
    const stageHeaderTitle = document.createElement('div');
    const stageHeaderActions = document.createElement('div');
    const toolRail = document.createElement('aside');
    const inspectorResizer = document.createElement('div');
    const inspectorPanel = document.createElement('aside');
    const inspectorTitle = document.createElement('div');
    const inspectorContent = document.createElement('div');

    root.append(header, body, status);
    host.appendChild(root);

    return {
        root,
        saveButton: /** @type {HTMLButtonElement} */ (root.querySelector('[data-role="save-project"]')),
        saveStatus: /** @type {HTMLElement} */ (root.querySelector('[data-role="save-status"]')),
        domainPreview: /** @type {HTMLElement} */ (root.querySelector('[data-role="domain-preview"]')),
        sidePanelNav,
        sidePanelResizer,
        sidePanelTitle: /** @type {HTMLElement} */ (root.querySelector('[data-role="side-panel-title"]')),
        sidePanelContainer: /** @type {HTMLElement} */ (root.querySelector('[data-role="side-panel-content"]')),
        tabs,
        stageHeader,
        stageHeaderTitle,
        stageHeaderActions,
        toolRail,
        inspectorResizer,
        inspectorPanel,
        inspectorTitle,
        inspectorContent,
        iframeHost,
        auxHost,
    };
}
