/* EzFloater by Asciiz

+ Cool dynamic context menus and hover tooltips that is aware of iframes and DOMs and shit idk

+ Query:
    handlers.queries = {
        'selector': {
            context: function(element) { ... },
            tooltip: function(element) { ... }
        }
    }

    + Note: To display iframe's floater, do @<the-iframe-id> <theiframe element, attribute, etc>
    + For example: @screen #inside-the-screen

+ Feel free to leave the name of the project you're working on here:
    + 
*/

(function() {
    const FLOATER_ID = 'custom-floater';
    const FLOATER_STYLE_ID = 'wc-floater-runtime-style';

    const stylesheet = {
        floaterBorder: '#2a2a2a',
        floaterBackground: '#181818',
        floaterText: '#f5f5f5',

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

    if (!document.getElementById(FLOATER_STYLE_ID)) {
        const style = document.createElement('style');
        style.id = FLOATER_STYLE_ID;
        style.innerHTML = `
            #custom-floater {
                position: fixed;
                top: 0;
                left: 0;
                min-width: 12rem;
                max-width: 24rem;
                min-height: 2.4rem;
                padding: 0.65rem 0.75rem;
                border: 1px solid ${stylesheet.floaterBorder};
                border-radius: 0.55rem;
                background: ${stylesheet.floaterBackground};
                color: ${stylesheet.floaterText};
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.42);
                z-index: 2147483647;
                opacity: 0;
                visibility: hidden;
                transform: translateY(4px);
                pointer-events: none;
                transition: opacity 0.12s ease, transform 0.12s ease, visibility 0.12s ease;
            }
            #custom-floater.is-visible {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            #custom-floater.mode-context {
                pointer-events: auto;
            }
            #custom-floater .floater-form {
                display: flex;
                flex-direction: column;
                gap: 0.45rem;
                width: 16rem;
            }
            #custom-floater .floater-title {
                font-size: 0.82rem;
                font-weight: 700;
                color: ${stylesheet.titleText};
            }
            #custom-floater .floater-label {
                font-size: 0.72rem;
                color: ${stylesheet.labelText};
            }
            #custom-floater .floater-breadcrumb {
                font-size: 0.75rem;
                color: ${stylesheet.breadcrumbText};
                word-break: break-word;
            }
            #custom-floater .floater-input {
                border: 1px solid ${stylesheet.inputBorder};
                border-radius: 0.42rem;
                background: ${stylesheet.inputBackground};
                color: ${stylesheet.inputText};
                height: 2rem;
                padding: 0 0.55rem;
            }
            #custom-floater .floater-input:focus {
                outline: 1px solid ${stylesheet.inputFocus};
                border-color: ${stylesheet.inputFocus};
            }
            #custom-floater .floater-button {
                border: 1px solid ${stylesheet.buttonBorder};
                background: ${stylesheet.buttonBackground};
                color: ${stylesheet.buttonText};
                border-radius: 0.45rem;
                height: 2rem;
                padding: 0 0.7rem;
                cursor: pointer;
                font-size: 0.78rem;
            }
            #custom-floater .floater-button:hover {
                background: ${stylesheet.buttonHover};
            }
            #custom-floater .floater-button.danger {
                background: ${stylesheet.dangerBackground};
                border-color: ${stylesheet.dangerBorder};
                color: ${stylesheet.dangerText};
            }
            #custom-floater .floater-button.danger:hover {
                background: ${stylesheet.dangerHover};
            }
        `;

        document.head.appendChild(style);
    }

    let floater = document.getElementById(FLOATER_ID);
    if (!floater) {
        floater = document.createElement('div');
        floater.id = FLOATER_ID;
        document.body.appendChild(floater);
    } else if (floater.id !== FLOATER_ID) {
        floater.id = FLOATER_ID;
    }

    const state = {
        mode: null,
        hoverElement: null,
        hoverDocument: null,
        hoverScopeKey: ''
    };

    const handlers = {
        values: {
            frameSelector: '#preview-frame',
            frameElementSelector: '[data-wc-node-id]',
            docContextHandlers: new WeakMap(),
            docClickHandlers: new WeakMap(),
            docKeyHandlers: new WeakMap(),
            docMoveHandlers: new WeakMap(),
            docOutHandlers: new WeakMap(),
            docLeaveHandlers: new WeakMap(),
            watchedIframes: new WeakSet()
        },

        actions: {
            'change-page-properties': function(button) {
                if (!window.WebConstruct) {
                    return;
                }

                const pageId = button.dataset.pageId;
                const titleInput = floater.querySelector('#floater-page-title');
                const slugInput = floater.querySelector('#floater-page-slug');

                const result = window.WebConstruct.updatePageProperties(pageId, {
                    title: titleInput ? titleInput.value : '',
                    slug: slugInput ? slugInput.value : ''
                });

                if (result.ok) {
                    hideFloater();
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
                    hideFloater();
                    return;
                }

                button.textContent = result.message || 'Delete failed';
            }
        },

        queries: {
            '.page-item': {
                context: function(el) {
                    if (!window.WebConstruct) {
                        return 'Page editor unavailable.';
                    }

                    const pageId = el.dataset.pageId;
                    const page = window.WebConstruct.getPage(pageId);
                    if (!page) {
                        return 'Page not found.';
                    }

                    const wrapper = document.createElement('div');
                    wrapper.className = 'floater-form';

                    const title = document.createElement('div');
                    title.className = 'floater-title';
                    title.textContent = 'Edit Page Properties';

                    const titleLabel = document.createElement('label');
                    titleLabel.className = 'floater-label';
                    titleLabel.htmlFor = 'floater-page-title';
                    titleLabel.textContent = 'Title';

                    const titleInput = document.createElement('input');
                    titleInput.id = 'floater-page-title';
                    titleInput.className = 'floater-input';
                    titleInput.type = 'text';
                    titleInput.value = page.title || '';

                    const slugLabel = document.createElement('label');
                    slugLabel.className = 'floater-label';
                    slugLabel.htmlFor = 'floater-page-slug';
                    slugLabel.textContent = 'Slug';

                    const slugInput = document.createElement('input');
                    slugInput.id = 'floater-page-slug';
                    slugInput.className = 'floater-input';
                    slugInput.type = 'text';
                    slugInput.value = page.slug || '';

                    const submitButton = document.createElement('button');
                    submitButton.type = 'button';
                    submitButton.className = 'floater-button';
                    submitButton.dataset.action = 'change-page-properties';
                    submitButton.dataset.pageId = pageId;
                    submitButton.textContent = 'Change';

                    wrapper.append(title, titleLabel, titleInput, slugLabel, slugInput, submitButton);
                    return wrapper;
                },
                tooltip: function(el) {
                    if (!window.WebConstruct) {
                        return null;
                    }

                    const pageId = el.dataset.pageId;
                    const page = window.WebConstruct.getPage(pageId);
                    if (!page) {
                        return null;
                    }

                    return createInfoFloater('Page', (page.title || page.slug || pageId || 'Untitled page'));
                }
            },

            '@preview-frame [data-wc-node-id]': {
                context: function(el) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'floater-form';

                    const title = document.createElement('div');
                    title.className = 'floater-title';
                    title.textContent = 'Element';

                    const breadcrumb = document.createElement('div');
                    breadcrumb.className = 'floater-breadcrumb';
                    breadcrumb.textContent = buildElementBreadcrumb(el);

                    const nodeId = el.getAttribute('data-wc-node-id') || '';
                    const deleteButton = document.createElement('button');
                    deleteButton.type = 'button';
                    deleteButton.className = 'floater-button';
                    deleteButton.dataset.action = 'delete-element';
                    deleteButton.dataset.nodeId = nodeId;
                    deleteButton.dataset.confirmed = 'false';
                    deleteButton.textContent = 'Delete';

                    wrapper.append(title, breadcrumb, deleteButton);
                    return wrapper;
                },
                tooltip: function(el) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'floater-form';

                    const title = document.createElement('div');
                    title.className = 'floater-title';
                    title.textContent = 'Element';

                    const breadcrumb = document.createElement('div');
                    breadcrumb.className = 'floater-breadcrumb';
                    breadcrumb.textContent = buildElementBreadcrumb(el);

                    wrapper.append(title, breadcrumb);
                    return wrapper;
                }
            }
        }
    };

    function createInfoFloater(titleText, bodyText) {
        const wrapper = document.createElement('div');
        wrapper.className = 'floater-form';

        const title = document.createElement('div');
        title.className = 'floater-title';
        title.textContent = titleText;

        const body = document.createElement('div');
        body.className = 'floater-breadcrumb';
        body.textContent = bodyText;

        wrapper.append(title, body);
        return wrapper;
    }

    function buildElementBreadcrumb(el) {
        const parts = [];
        let current = el;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
            parts.push(current.tagName.toLowerCase());
            if (current.tagName.toLowerCase() === 'body') {
                break;
            }
            current = current.parentElement;
        }

        return parts.reverse().join(' > ');
    }

    function normalizeQueryDefinition(definition) {
        if (typeof definition === 'function') {
            return {
                context: definition,
                tooltip: null
            };
        }

        if (!definition || typeof definition !== 'object') {
            return {
                context: null,
                tooltip: null
            };
        }

        return {
            context: typeof definition.context === 'function' ? definition.context : null,
            tooltip: typeof definition.tooltip === 'function' ? definition.tooltip : null
        };
    }

    const compiledQueries = Object.entries(handlers.queries).map(function(entry) {
        const queryDef = normalizeQueryDefinition(entry[1]);
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
            context: queryDef.context,
            tooltip: queryDef.tooltip
        };
    });

    function getOrCreateHandler(map, key, factory) {
        let handler = map.get(key);
        if (!handler) {
            handler = factory();
            map.set(key, handler);
        }
        return handler;
    }

    function clearHoverState() {
        state.hoverElement = null;
        state.hoverDocument = null;
        state.hoverScopeKey = '';
    }

    function hideFloater() {
        state.mode = null;
        floater.classList.remove('is-visible');
        floater.classList.remove('mode-context');
        clearHoverState();
    }

    function setFloaterPosition(x, y) {
        const offset = 8;
        const maxLeft = window.innerWidth - floater.offsetWidth - offset;
        const maxTop = window.innerHeight - floater.offsetHeight - offset;

        const nextLeft = Math.min(x + offset, Math.max(offset, maxLeft));
        const nextTop = Math.min(y + offset, Math.max(offset, maxTop));

        floater.style.left = nextLeft + 'px';
        floater.style.top = nextTop + 'px';
    }

    function showFloater(content, x, y, mode) {
        floater.replaceChildren();

        if (typeof content === 'string') {
            floater.textContent = content;
        } else {
            floater.appendChild(content);
        }

        state.mode = mode;
        floater.classList.toggle('mode-context', mode === 'context');
        floater.classList.add('is-visible');
        setFloaterPosition(x, y);
    }

    function resolveClientPoint(event, frameChain) {
        let x = event.clientX;
        let y = event.clientY;

        frameChain.forEach(function(frameEl) {
            const rect = frameEl.getBoundingClientRect();
            x += rect.left;
            y += rect.top;
        });

        return { x: x, y: y };
    }

    function runFloaterQueries(mode, context) {
        let target = context.element;

        if (target && target.nodeType === Node.TEXT_NODE) {
            target = target.parentElement;
        }

        if (!target || target.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }

        for (let i = 0; i < compiledQueries.length; i += 1) {
            const query = compiledQueries[i];

            if (query.scope.length !== context.scope.length) {
                continue;
            }

            let scopeOk = true;
            for (let j = 0; j < query.scope.length; j += 1) {
                if (query.scope[j] !== '*' && query.scope[j] !== context.scope[j]) {
                    scopeOk = false;
                    break;
                }
            }
            if (!scopeOk) {
                continue;
            }

            if (!query.selector) {
                continue;
            }

            const matched = target.closest(query.selector);
            if (!matched) {
                continue;
            }

            const runMode = query[mode];
            if (typeof runMode !== 'function') {
                continue;
            }

            const content = runMode(matched, context);
            if (!content) {
                return null;
            }

            return {
                query: query,
                matched: matched,
                content: content
            };
        }

        return null;
    }

    function bindDocumentContext(doc, scopeChain, frameChain) {
        if (!doc) {
            return;
        }

        const contextHandler = getOrCreateHandler(handlers.values.docContextHandlers, doc, function() {
            return function(event) {
                const point = resolveClientPoint(event, frameChain);
                const result = runFloaterQueries('context', {
                    scope: scopeChain,
                    element: event.target,
                    x: point.x,
                    y: point.y,
                    event: event,
                    document: doc
                });

                event.preventDefault();
                event.stopPropagation();

                if (!result) {
                    hideFloater();
                    return;
                }

                showFloater(result.content, point.x, point.y, 'context');
            };
        });

        doc.removeEventListener('contextmenu', contextHandler, true);
        doc.addEventListener('contextmenu', contextHandler, true);

        const moveHandler = getOrCreateHandler(handlers.values.docMoveHandlers, doc, function() {
            return function(event) {
                if (state.mode === 'context') {
                    return;
                }

                const point = resolveClientPoint(event, frameChain);
                const result = runFloaterQueries('tooltip', {
                    scope: scopeChain,
                    element: event.target,
                    x: point.x,
                    y: point.y,
                    event: event,
                    document: doc
                });

                if (!result) {
                    if (state.mode === 'tooltip') {
                        hideFloater();
                    }
                    return;
                }

                const scopeKey = scopeChain.join('>');
                const isSameHoverTarget =
                    state.mode === 'tooltip' &&
                    state.hoverElement === result.matched &&
                    state.hoverDocument === doc &&
                    state.hoverScopeKey === scopeKey;

                if (!isSameHoverTarget) {
                    showFloater(result.content, point.x, point.y, 'tooltip');
                } else {
                    setFloaterPosition(point.x, point.y);
                }

                state.hoverElement = result.matched;
                state.hoverDocument = doc;
                state.hoverScopeKey = scopeKey;
            };
        });

        doc.removeEventListener('mousemove', moveHandler, true);
        doc.addEventListener('mousemove', moveHandler, true);

        const outHandler = getOrCreateHandler(handlers.values.docOutHandlers, doc, function() {
            return function(event) {
                if (state.mode !== 'tooltip' || state.hoverDocument !== doc || !state.hoverElement) {
                    return;
                }

                const nextTarget = event.relatedTarget;
                if (nextTarget && state.hoverElement.contains(nextTarget)) {
                    return;
                }

                hideFloater();
            };
        });

        doc.removeEventListener('mouseout', outHandler, true);
        doc.addEventListener('mouseout', outHandler, true);

        const leaveHandler = getOrCreateHandler(handlers.values.docLeaveHandlers, doc, function() {
            return function() {
                if (state.mode === 'tooltip' && state.hoverDocument === doc) {
                    hideFloater();
                }
            };
        });

        doc.removeEventListener('mouseleave', leaveHandler, true);
        doc.addEventListener('mouseleave', leaveHandler, true);

        const clickHandler = getOrCreateHandler(handlers.values.docClickHandlers, doc, function() {
            return function(event) {
                if (doc === document && floater.contains(event.target)) {
                    return;
                }
                hideFloater();
            };
        });

        doc.removeEventListener('click', clickHandler, true);
        doc.addEventListener('click', clickHandler, true);

        const keyHandler = getOrCreateHandler(handlers.values.docKeyHandlers, doc, function() {
            return function(event) {
                if (event.key === 'Escape') {
                    hideFloater();
                }
            };
        });

        doc.removeEventListener('keydown', keyHandler, true);
        doc.addEventListener('keydown', keyHandler, true);

        const iframes = Array.from(doc.querySelectorAll('iframe'));
        iframes.forEach(function(iframeEl, index) {
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

                bindDocumentContext(childDoc, nextScope, nextFrameChain);
            }

            bindCurrentIframeDoc();

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

    {
        const previewFrame = document.querySelector(handlers.values.frameSelector);
        const frameDoc = previewFrame ? previewFrame.contentDocument : null;
        if (previewFrame && frameDoc) {
            bindDocumentContext(frameDoc, ['preview-frame'], [previewFrame]);
        }
    }

    floater.addEventListener('click', function(event) {
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

    document.addEventListener('click', function(event) {
        if (!floater.contains(event.target)) {
            hideFloater();
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            hideFloater();
        }
    });

    window.EzFloater = {
        hide: hideFloater,
        handlers: handlers
    };
})();
