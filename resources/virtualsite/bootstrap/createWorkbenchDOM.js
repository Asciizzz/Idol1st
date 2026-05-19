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

    const toolRail = document.createElement('aside');
    toolRail.className = 'vsb-tool-rail';
    toolRail.setAttribute('aria-label', 'Viewport Tools');
    toolRail.innerHTML = `
        <button type="button" class="vsb-tool-btn is-active" data-tool-mode="select" title="Select Mode (Shift+W)">
            <span class="vsb-tool-btn-icon">&#9678;</span>
            <span class="vsb-tool-btn-text">Select</span>
        </button>
        <button type="button" class="vsb-tool-btn" data-tool-mode="add" title="Add Node Mode (Shift+A)">
            <span class="vsb-tool-btn-icon">+</span>
            <span class="vsb-tool-btn-text">Add</span>
        </button>
        <button type="button" class="vsb-tool-btn" data-tool-mode="delete" title="Delete Mode (Shift+D)">
            <span class="vsb-tool-btn-icon">&#9003;</span>
            <span class="vsb-tool-btn-text" data-delete-mode-label>delete</span>
        </button>
    `;

    const stage = document.createElement('section');
    stage.className = 'vsb-stage';

    const stageHeader = document.createElement('div');
    stageHeader.className = 'vsb-stage-header';
    stageHeader.innerHTML = `
        <div class="vsb-stage-title" data-role="stage-title">Page</div>
        <div class="vsb-stage-actions" data-role="stage-actions"></div>
    `;

    const stageBody = document.createElement('div');
    stageBody.className = 'vsb-stage-body';

    const iframeHost = document.createElement('div');
    iframeHost.className = 'vsb-iframe-host';

    const auxHost = document.createElement('div');
    auxHost.className = 'vsb-aux-host';

    const inspectorResizer = document.createElement('div');
    inspectorResizer.className = 'vsb-inspector-resizer';
    inspectorResizer.setAttribute('role', 'separator');
    inspectorResizer.setAttribute('aria-orientation', 'vertical');
    inspectorResizer.setAttribute('aria-label', 'Resize inspector panel');

    const inspectorPanel = document.createElement('aside');
    inspectorPanel.className = 'vsb-inspector-panel';
    inspectorPanel.innerHTML = `
        <div class="vsb-inspector-header" data-role="inspector-title">Node Inspector</div>
        <div class="vsb-inspector-content" data-role="inspector-content"></div>
    `;

    stageBody.append(iframeHost, auxHost);
    stage.append(stageHeader, stageBody);

    workspace.append(toolRail, stage, inspectorResizer, inspectorPanel);
    main.append(tabs, workspace);
    body.append(sidePanelNav, sidePanel, sidePanelResizer, main);

    const status = document.createElement('footer');
    status.className = 'vsb-status';
    status.innerHTML = `
        <span class="vsb-status-chip">Ready</span>
        <span class="vsb-status-chip" data-role="save-status">Idle.</span>
    `;

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
        stageHeaderTitle: /** @type {HTMLElement} */ (stageHeader.querySelector('[data-role="stage-title"]')),
        stageHeaderActions: /** @type {HTMLElement} */ (stageHeader.querySelector('[data-role="stage-actions"]')),
        toolRail,
        inspectorResizer,
        inspectorPanel,
        inspectorTitle: /** @type {HTMLElement} */ (inspectorPanel.querySelector('[data-role="inspector-title"]')),
        inspectorContent: /** @type {HTMLElement} */ (inspectorPanel.querySelector('[data-role="inspector-content"]')),
        iframeHost,
        auxHost,
    };
}

