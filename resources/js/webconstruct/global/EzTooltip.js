/* EzTooltip by Asciiz

+ Cool dynamic element based tool tips with a surprising level of iframe support

+ Usage:
    + Freely edit the style.innerHTML to customize the tooltip design
    + Freely eidt the handlers to add new query handlers or action handlers for buttons inside tooltips

+ It would be appreciated if you can write the name of the project you're using this for:
    + Idol1st Web Constructor

*/


(function() {
    const TOOLTIP_ID = 'custom-tooltip';
    const TOOLTIP_STYLE_ID = 'wc-tooltip-runtime-style';

    // Tooltip palette playground here
    const stylesheet = {
        tooltipBorder: '#2a2a2a',
        tooltipBackground: '#181818',
        tooltipText: '#f5f5f5',

        titleText: '#ffffff',
        labelText: '#b0b0b0',
        breadcrumbText: '#b0b0b0',

        inputBorder: '#2f2f2f',
        inputBackground: '#111111',
        inputText: '#ffffff',
        inputFocus: '#8b5cf6',

        buttonBorder: '#2f2f2f',
        buttonBackground: '#0f0f0f',
        buttonText: '#ffffff',
        buttonHover: '#1a1a1a',

        dangerBackground: '#2f1a26',
        dangerBorder: '#553045',
        dangerText: '#ffc8d9',
        dangerHover: '#3b2030'
    };

    // Self-contained tooltip (holy sht look at this css dawg)
    // If you know what you're doing, go ahead and edit style.innerHTML
    if (!document.getElementById(TOOLTIP_STYLE_ID)) {
        const style = document.createElement('style');
        style.id = TOOLTIP_STYLE_ID;
        style.innerHTML = `
            #custom-tooltip {
                position: fixed;
                top: 0;
                left: 0;
                min-width: 12rem;
                max-width: 24rem;
                min-height: 2.4rem;
                padding: 0.65rem 0.75rem;
                border: 1px solid ${stylesheet.tooltipBorder};
                border-radius: 0.55rem;
                background: ${stylesheet.tooltipBackground};
                color: ${stylesheet.tooltipText};
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.42);
                z-index: 2147483647;
                opacity: 0;
                visibility: hidden;
                transform: translateY(4px);
                pointer-events: none;
                transition: opacity 0.12s ease, transform 0.12s ease, visibility 0.12s ease;
            }
            #custom-tooltip.is-visible {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
                pointer-events: auto;
            }
            #custom-tooltip .tooltip-form {
                display: flex;
                flex-direction: column;
                gap: 0.45rem;
                width: 16rem;
            }
            #custom-tooltip .tooltip-title {
                font-size: 0.82rem;
                font-weight: 700;
                color: ${stylesheet.titleText};
            }
            #custom-tooltip .tooltip-label {
                font-size: 0.72rem;
                color: ${stylesheet.labelText};
            }
            #custom-tooltip .tooltip-breadcrumb {
                font-size: 0.75rem;
                color: ${stylesheet.breadcrumbText};
                word-break: break-word;
            }
            #custom-tooltip .tooltip-input {
                border: 1px solid ${stylesheet.inputBorder};
                border-radius: 0.42rem;
                background: ${stylesheet.inputBackground};
                color: ${stylesheet.inputText};
                height: 2rem;
                padding: 0 0.55rem;
            }
            #custom-tooltip .tooltip-input:focus {
                outline: 1px solid ${stylesheet.inputFocus};
                border-color: ${stylesheet.inputFocus};
            }
            #custom-tooltip .tooltip-button {
                border: 1px solid ${stylesheet.buttonBorder};
                background: ${stylesheet.buttonBackground};
                color: ${stylesheet.buttonText};
                border-radius: 0.45rem;
                height: 2rem;
                padding: 0 0.7rem;
                cursor: pointer;
                font-size: 0.78rem;
            }
            #custom-tooltip .tooltip-button:hover {
                background: ${stylesheet.buttonHover};
            }
            #custom-tooltip .tooltip-button.danger {
                background: ${stylesheet.dangerBackground};
                border-color: ${stylesheet.dangerBorder};
                color: ${stylesheet.dangerText};
            }
            #custom-tooltip .tooltip-button.danger:hover {
                background: ${stylesheet.dangerHover};
            }
        `;

        document.head.appendChild(style);
    }

    // Create tooltip root if missing, otherwise reuse existing node
    let tooltip = document.getElementById(TOOLTIP_ID);
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = TOOLTIP_ID;
        document.body.appendChild(tooltip);
    }


    // Element playground
    const handlers = {
        values: {
            frameSelector: '#preview-frame',
            frameElementSelector: '[data-wc-node-id]',
            docHandlers: new WeakMap(),
            docClickHandlers: new WeakMap(),
            docKeyHandlers: new WeakMap(),
            watchedIframes: new WeakSet()
        },

        actions: {
            'change-page-properties': function(button) {
                if (!window.WebConstruct) {
                    return;
                }

                const pageId = button.dataset.pageId;
                const titleInput = tooltip.querySelector('#tooltip-page-title');
                const slugInput = tooltip.querySelector('#tooltip-page-slug');

                const result = window.WebConstruct.updatePageProperties(pageId, {
                    title: titleInput ? titleInput.value : '',
                    slug: slugInput ? slugInput.value : ''
                });

                if (result.ok) {
                    hideTooltip();
                }
            },

            'delete-element': function(button) {
                if (!window.WebConstruct) {
                    return;
                }

                const isConfirmed = button.dataset.confirmed === 'true';
                if (!isConfirmed) {
                    button.dataset.confirmed = 'true';
                    button.classList.add('danger');
                    button.textContent = 'Are you sure?';
                    return;
                }

                const result = window.WebConstruct.deleteNode(button.dataset.nodeId);
                if (result.ok) {
                    hideTooltip();
                    return;
                }

                button.textContent = result.message || 'Delete failed';
            }
        },

        queries: {
            '.page-item': function(el) {
                if (!window.WebConstruct) {
                    return 'Page editor unavailable.';
                }

                const pageId = el.dataset.pageId;
                const page = window.WebConstruct.getPage(pageId);
                if (!page) {
                    return 'Page not found.';
                }

                const wrapper = document.createElement('div');
                wrapper.className = 'tooltip-form';

                const title = document.createElement('div');
                title.className = 'tooltip-title';
                title.textContent = 'Edit Page Properties';

                const titleLabel = document.createElement('label');
                titleLabel.className = 'tooltip-label';
                titleLabel.htmlFor = 'tooltip-page-title';
                titleLabel.textContent = 'Title';

                const titleInput = document.createElement('input');
                titleInput.id = 'tooltip-page-title';
                titleInput.className = 'tooltip-input';
                titleInput.type = 'text';
                titleInput.value = page.title || '';

                const slugLabel = document.createElement('label');
                slugLabel.className = 'tooltip-label';
                slugLabel.htmlFor = 'tooltip-page-slug';
                slugLabel.textContent = 'Slug';

                const slugInput = document.createElement('input');
                slugInput.id = 'tooltip-page-slug';
                slugInput.className = 'tooltip-input';
                slugInput.type = 'text';
                slugInput.value = page.slug || '';

                const submitButton = document.createElement('button');
                submitButton.type = 'button';
                submitButton.className = 'tooltip-button';
                submitButton.dataset.action = 'change-page-properties';
                submitButton.dataset.pageId = pageId;
                submitButton.textContent = 'Change';

                wrapper.append(title, titleLabel, titleInput, slugLabel, slugInput, submitButton);
                return wrapper;
            },

            '@preview-frame [data-wc-node-id]': function(el) {
                const parts = [];
                let current = el;

                while (current && current.nodeType === Node.ELEMENT_NODE) {
                    parts.push(current.tagName.toLowerCase());
                    if (current.tagName.toLowerCase() === 'body') {
                        break;
                    }
                    current = current.parentElement;
                }

                const wrapper = document.createElement('div');
                wrapper.className = 'tooltip-form';

                const title = document.createElement('div');
                title.className = 'tooltip-title';
                title.textContent = 'Element';

                const breadcrumb = document.createElement('div');
                breadcrumb.className = 'tooltip-breadcrumb';
                breadcrumb.textContent = parts.reverse().join(' > ');

                const nodeId = el.getAttribute('data-wc-node-id') || '';
                const deleteButton = document.createElement('button');
                deleteButton.type = 'button';
                deleteButton.className = 'tooltip-button';
                deleteButton.dataset.action = 'delete-element';
                deleteButton.dataset.nodeId = nodeId;
                deleteButton.dataset.confirmed = 'false';
                deleteButton.textContent = 'Delete';

                wrapper.append(title, breadcrumb, deleteButton);
                return wrapper;
            }
        }
    };


// -----------------------------------------------------------------------
// ------------------ DON'T TOUCH ANYTHING BELOW PLEASE ------------------
// -----------------------------------------------------------------------

    const compiledQueries = Object.entries(handlers.queries).map(function(entry) {
        // Parse @scope tokens and keep the remaining selector for fast runtime matching.
        const tokens = String(entry[0] || '').trim().split(/\s+/).filter(Boolean);
        const scope = [];
        const selectorTokens = [];

        tokens.forEach(function(token) {
            if (token.startsWith('@')) {
                scope.push(token.slice(1));
                return;
            }
            selectorTokens.push(token);
        });

        return {
            raw: entry[0],
            scope: scope,
            selector: selectorTokens.join(' '),
            run: entry[1]
        };
    });

    function hideTooltip() {
        tooltip.classList.remove('is-visible');
    }

    function showTooltip(content, x, y) {
        tooltip.replaceChildren();

        if (typeof content === 'string') {
            tooltip.textContent = content;
        } else {
            tooltip.appendChild(content);
        }

        const offset = 8;
        const maxLeft = window.innerWidth - tooltip.offsetWidth - offset;
        const maxTop = window.innerHeight - tooltip.offsetHeight - offset;

        const nextLeft = Math.min(x + offset, Math.max(offset, maxLeft));
        const nextTop = Math.min(y + offset, Math.max(offset, maxTop));

        tooltip.style.left = nextLeft + 'px';
        tooltip.style.top = nextTop + 'px';
        tooltip.classList.add('is-visible');
    }
    function runQueries(context) {
        let target = context.element;
        // Right click can originate from a text node; normalize to element for closest().
        if (target && target.nodeType === Node.TEXT_NODE) {
            target = target.parentElement;
        }

        if (!target || target.nodeType !== Node.ELEMENT_NODE) {
            hideTooltip();
            return;
        }

        for (let i = 0; i < compiledQueries.length; i += 1) {
            const query = compiledQueries[i];

            // Scope must match exactly, except wildcard segments (*).
            if (query.scope.length !== context.scope.length) continue;

            let scopeOk = true;
            for (let j = 0; j < query.scope.length; j += 1) {
                if (query.scope[j] !== '*' && query.scope[j] !== context.scope[j]) {
                    scopeOk = false;
                    break;
                }
            }
            if (!scopeOk) continue;

            if (!query.selector) continue;

            const matched = target.closest(query.selector);
            if (!matched) continue;

            const content = query.run(matched, context);
            if (!content) {
                hideTooltip();
                return;
            }

            showTooltip(content, context.x, context.y);
            return;
        }

        hideTooltip();
    }

    // Recursively bind context menu handlers to a document and its nested iframes, with scope tracking and shi idk.
    function bindDocumentContext(doc, scopeChain, frameChain) {
        if (!doc) {
            return;
        }

        let handler = handlers.values.docHandlers.get(doc);
        if (!handler) {
            handler = function(event) {
                let x = event.clientX;
                let y = event.clientY;
                // Iframe coord to main page coord conversion (spooky)
                frameChain.forEach(function(frameEl) {
                    const rect = frameEl.getBoundingClientRect();
                    x += rect.left;
                    y += rect.top;
                });

                event.preventDefault();
                event.stopPropagation();

                runQueries({
                    scope: scopeChain,
                    element: event.target,
                    x: x,
                    y: y
                });
            };
            handlers.values.docHandlers.set(doc, handler);
        }

        // Suppressing default context menu
        doc.removeEventListener('contextmenu', handler, true);
        doc.addEventListener('contextmenu', handler, true);

        // Click and key handlers for tooltip dismissal
        let clickHandler = handlers.values.docClickHandlers.get(doc);
        if (!clickHandler) {
            handlers.values.docClickHandlers.set(doc, function(event) {
                // Dont fcking hide itself
                if (doc === document && tooltip.contains(event.target)) return;
                hideTooltip();
            });
        }
        doc.removeEventListener('click', clickHandler, true);
        doc.addEventListener('click', clickHandler, true);

        let keyHandler = handlers.values.docKeyHandlers.get(doc);
        if (!keyHandler) {
            handlers.values.docKeyHandlers.set(doc, function(event) {
                if (event.key === 'Escape') hideTooltip();
            });
        }
        doc.removeEventListener('keydown', keyHandler, true);
        doc.addEventListener('keydown', keyHandler, true);

        // Discover nested iframes and bind each child document context.
        const iframes = Array.from(doc.querySelectorAll('iframe'));
        iframes.forEach(function(iframeEl, index) {
            // Scope id priority: data-scope-id -> id -> name -> fallback.
            const scopeId = iframeEl.getAttribute('data-scope-id') || iframeEl.id || iframeEl.name || ('frame-' + index);
            const nextScope = scopeChain.concat(scopeId);
            const nextFrameChain = frameChain.concat(iframeEl);

            function bindCurrentIframeDoc() {
                let childDoc;
                try {
                    childDoc = iframeEl.contentDocument;
                } catch (error) {
                    return;
                }

                if (!childDoc) {
                    return;
                }

                // Recursive bind
                bindDocumentContext(childDoc, nextScope, nextFrameChain);
            }

            bindCurrentIframeDoc();

            // Avoid binding load event multiple times for the same iframe if it appears in multiple contexts (very rare)
            if (!handlers.values.watchedIframes.has(iframeEl)) {
                handlers.values.watchedIframes.add(iframeEl);
                iframeEl.addEventListener('load', bindCurrentIframeDoc);
            }
        });
    }

    bindDocumentContext(document, [], []);

    document.addEventListener('wc:frame-rendered', function(event) {
        const detail = event.detail || {};
        const previewFrame = document.querySelector(handlers.values.frameSelector);
        const frameDoc = detail.frameDocument || (previewFrame ? previewFrame.contentDocument : null);
        if (!previewFrame || !frameDoc) {
            return;
        }

        bindDocumentContext(frameDoc, ['preview-frame'], [previewFrame]);
    });

    // Initial bind for preview iframe context
    {
        const previewFrame = document.querySelector(handlers.values.frameSelector);
        const frameDoc = previewFrame ? previewFrame.contentDocument : null;
        if (previewFrame && frameDoc) {
            bindDocumentContext(frameDoc, ['preview-frame'], [previewFrame]);
        }
    }

    // Event for tooltip action buttons
    tooltip.addEventListener('click', function(event) {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) {
            return;
        }

        const action = actionButton.dataset.action;
        const actionFn = handlers.actions[action];
        if (typeof actionFn === 'function') {
            actionFn(actionButton);
        }
    });

    // Hide tooltip
    document.addEventListener('click', function(event) {
        if (!tooltip.contains(event.target)) {
            hideTooltip();
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            hideTooltip();
        }
    });
})();
