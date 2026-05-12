export class Tab {
    constructor(options) {
        this.id = options.id;
        this.kind = options.kind;
        this.title = options.title;
        this.renderer = options.renderer;
        this.closable = options.closable !== false;
        this.showButton = options.showButton !== false;
        this.buttonAttributes = options.attributes || {};
        this.iconHTML = options.iconHTML || '';
        this.extraContentFactory = typeof options.extraContentFactory === 'function'
            ? options.extraContentFactory
            : null;

        this.button = this.buildButton();
        this.panel = this.buildPanel();
    }

    buildButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'editor-tab-button';
        button.dataset.tabId = this.id;
        button.dataset.tabKind = this.kind;

        Object.entries(this.buttonAttributes).forEach(function(entry) {
            button.setAttribute(entry[0], String(entry[1]));
        });

        if (!this.showButton) {
            button.classList.add('is-hidden');
        }

        const icon = document.createElement('span');
        icon.className = 'editor-tab-icon';
        icon.innerHTML = this.iconHTML;
        button.appendChild(icon);

        const label = document.createElement('span');
        label.className = 'editor-tab-label';
        label.textContent = this.title;
        button.appendChild(label);

        if (this.extraContentFactory) {
            const extraContent = this.extraContentFactory(this);
            if (extraContent instanceof Element) {
                button.appendChild(extraContent);
            }
        }

        if (this.closable) {
            const close = document.createElement('span');
            close.className = 'editor-tab-close';
            close.dataset.tabClose = this.id;
            close.textContent = 'x';
            button.appendChild(close);
        }

        return button;
    }

    buildPanel() {
        const panel = document.createElement('section');
        panel.className = 'editor-tab-panel';
        panel.dataset.tabPanel = this.id;
        return panel;
    }

    mount(tabBar, stage) {
        tabBar.appendChild(this.button);
        stage.appendChild(this.panel);
        this.renderer.mount(this.panel);
    }

    activate() {
        this.button.classList.add('is-active');
        this.panel.classList.add('is-active');
        this.renderer.activate();
    }

    deactivate() {
        this.button.classList.remove('is-active');
        this.panel.classList.remove('is-active');
        this.renderer.deactivate();
    }

    reselect() {
        if (typeof this.renderer.reselect === 'function') {
            this.renderer.reselect();
        }
    }

    setModeIndicator(mode) {
        const strip = this.button.querySelector('[data-page-mode-strip]');
        if (!strip) {
            return;
        }

        strip.querySelectorAll('[data-mode]').forEach(function(node) {
            node.classList.toggle('is-on', node.dataset.mode === mode);
        });
    }

    setTitle(nextTitle) {
        this.title = nextTitle;
        const label = this.button.querySelector('.editor-tab-label');
        if (label) {
            label.textContent = nextTitle;
        }
    }

    destroy() {
        if (typeof this.renderer.destroy === 'function') {
            this.renderer.destroy();
        }
        this.button.remove();
        this.panel.remove();
    }
}
