import { BUS } from './constants.js';
import { cssObjectToText, cssTextToObject } from './utils.js';

export class RenderStyle {
    constructor(options) {
        this.bus = options.bus;
        this.runtime = options.runtime;
        this.styleName = options.styleName;
        this.unsubscribers = [];

        this.root = document.createElement('div');
        this.root.className = 'render-style';

        this.title = document.createElement('div');
        this.title.className = 'render-style-title';

        this.controls = document.createElement('div');
        this.controls.className = 'render-style-controls';

        this.applyButton = document.createElement('button');
        this.applyButton.type = 'button';
        this.applyButton.className = 'editor-button';
        this.applyButton.textContent = 'Apply CSS';

        this.reloadButton = document.createElement('button');
        this.reloadButton.type = 'button';
        this.reloadButton.className = 'editor-button is-ghost';
        this.reloadButton.textContent = 'Reload';

        this.controls.append(this.reloadButton, this.applyButton);

        this.textarea = document.createElement('textarea');
        this.textarea.className = 'render-style-textarea';
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
            this.bus.on(BUS.STYLES_CHANGED, () => {
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

        const source = site.getStylesheet(this.styleName);
        this.title.textContent = this.styleName.endsWith('.css')
            ? this.styleName
            : `${this.styleName}.css`;
        this.textarea.value = cssObjectToText(source);
    }

    applyChanges() {
        const site = this.runtime.getSite();
        if (!site) {
            return;
        }

        const parsed = cssTextToObject(this.textarea.value);
        site.setStylesheet(this.styleName, parsed);
        this.bus.emit(BUS.STYLES_CHANGED, { styleName: this.styleName });
    }

    destroy() {
        this.unsubscribers.forEach(function(unsubscribe) {
            unsubscribe();
        });
        this.unsubscribers = [];
        this.root.remove();
    }
}
