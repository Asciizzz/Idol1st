import { BUS } from './constants.js';

export class RenderScript {
    constructor(options) {
        this.bus = options.bus;
        this.runtime = options.runtime;
        this.scriptName = options.scriptName;
        this.unsubscribers = [];

        this.root = document.createElement('div');
        this.root.className = 'render-script';

        this.title = document.createElement('div');
        this.title.className = 'render-script-title';
        this.title.textContent = this.scriptName.endsWith('.js')
            ? this.scriptName
            : `${this.scriptName}.js`;

        this.controls = document.createElement('div');
        this.controls.className = 'render-script-controls';

        this.applyButton = document.createElement('button');
        this.applyButton.type = 'button';
        this.applyButton.className = 'editor-button';
        this.applyButton.textContent = 'Apply Script JSON';

        this.reloadButton = document.createElement('button');
        this.reloadButton.type = 'button';
        this.reloadButton.className = 'editor-button is-ghost';
        this.reloadButton.textContent = 'Reload';

        this.controls.append(this.reloadButton, this.applyButton);

        this.textarea = document.createElement('textarea');
        this.textarea.className = 'render-script-textarea';
        this.textarea.spellcheck = false;

        this.root.append(this.title, this.controls, this.textarea);
    }

    mount(parent) {
        parent.appendChild(this.root);
        this.bindEvents();
        this.reloadFromSite();
    }

    activate() {
        this.runtime.setCanvasVisible(false);
        this.reloadFromSite();
    }

    deactivate() {}

    bindEvents() {
        this.applyButton.addEventListener('click', () => {
            this.applyChanges();
        });

        this.reloadButton.addEventListener('click', () => {
            this.reloadFromSite();
        });

        this.unsubscribers.push(
            this.bus.on(BUS.SCRIPTS_CHANGED, () => {
                if (!document.body.contains(this.root)) {
                    return;
                }
                this.reloadFromSite();
            })
        );
    }

    reloadFromSite() {
        const site = this.runtime.getSite();
        if (!site) {
            return;
        }

        const source = site.getScript(this.scriptName) || {
            variables: {},
            actions: {},
            events: {},
        };

        this.textarea.value = JSON.stringify(source, null, 2);
    }

    applyChanges() {
        const site = this.runtime.getSite();
        if (!site) {
            return;
        }

        try {
            const parsed = JSON.parse(this.textarea.value);
            site.addScript(this.scriptName, parsed);
            this.bus.emit(BUS.SCRIPTS_CHANGED, { scriptName: this.scriptName });
        } catch (_) {
            // Keep editing state unchanged if parsing fails.
        }
    }

    destroy() {
        this.unsubscribers.forEach(function(unsubscribe) {
            unsubscribe();
        });
        this.unsubscribers = [];
        this.root.remove();
    }
}
