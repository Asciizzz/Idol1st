/* EzFloater by Asciiz

+ Cool dynamic context menus and hover tooltips that is aware of iframes and DOMs and shit

+ Query:
    handlers.queries = {
        'selector': {
            context: function(element) { ... },
            tooltip: function(element) { ... }
        }
    }

    + Note: To display iframe's floater, do @<the-iframe-id> <the iframe element, attribute, etc>
    + For example: @screen #inside-the-screen

+ Style: freely customize the floater style in your css
    #ez-floater

+ Feel free to leave the name of the project you're working on here:
    + Idol1st
*/

(function() {
    const FLOATER_ID = 'ez-floater';
    const FLOATER_STYLE_ID = 'ez-floater-runtime-style';

    // Default styles for coordination and display
    if (!document.getElementById(FLOATER_STYLE_ID)) {
        const style = document.createElement('style');
        style.id = FLOATER_STYLE_ID;
        style.innerHTML = `
            #ez-floater {
                position: fixed;
                top: 0;
                left: 0;
                z-index: 2147483647;
                opacity: 0;
                pointer-events: none;
            }
            #ez-floater.is-visible {
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
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

    class Handler {
        constructor() {
            this.events = {};
            this.queries = {};
        }

        addEventFn(eventName, actionName, actionFn) {
            if (!eventName || !actionName || typeof actionFn !== 'function') return null;

            // Event group hasn't exist
            if (!this.events[eventName]) this.events[eventName] = {};

            this.events[eventName][actionName] = actionFn;
            return actionFn;
        }

        removeEventFn(eventName, actionName) {
            const eventGroup = this.events[eventName];
            if (!eventGroup) return false;

            if (!actionName) {
                delete this.events[eventName];
                return true;
            }

            if (!Object.prototype.hasOwnProperty.call(eventGroup, actionName)) {
                return false;
            }

            delete eventGroup[actionName];
            if (Object.keys(eventGroup).length === 0) {
                delete this.events[eventName];
            }

            return true;
        }

        getEventFn(eventName, actionName) {
            const eventGroup = this.events[eventName];
            if (!eventGroup) {
                return null;
            }
            return eventGroup[actionName] || null;
        }

        addQuery(rawQuery, definition) {
            if (!rawQuery || typeof definition !== 'object') return null;

            const tokens = String(rawQuery || '').trim().split(/\s+/).filter(Boolean);
            const scope = [];
            const selectorTokens = [];

            tokens.forEach(function(token) {
                if (token.startsWith('@')) {
                    scope.push(token.slice(1));
                    return;
                }
                selectorTokens.push(token);
            });

            const hasContext = typeof definition.context === 'function';
            const hasTooltip = typeof definition.tooltip === 'function';

            const compiledQuery = {
                raw: rawQuery,
                scope: scope,
                selector: selectorTokens.join(' '),
                context: hasContext ? definition.context : null,
                tooltip: hasTooltip ? definition.tooltip : null
            };

            this.queries[rawQuery] = compiledQuery;
            return compiledQuery;
        }

        removeQuery(rawQuery) {
            if (!Object.prototype.hasOwnProperty.call(this.queries, rawQuery)) {
                return false;
            }

            delete this.queries[rawQuery];
            return true;
        }

        getQuery(query) {
            return this.queries[query] || null;
        }

        getCompiledQueries() {
            return Object.values(this.queries);
        }
    }
    const handlers = new Handler();

    handlers.addEventFn('leftclick', 'change-page-properties', function(event, button) {
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
    });

    handlers.addEventFn('leftclick', 'delete-element', function(event, button) {
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
    });

    handlers.addQuery('.page-item', {
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
            submitButton.dataset.leftclick = 'change-page-properties';
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

            const wrapper = document.createElement('div');
            wrapper.className = 'floater-form';

            const title = document.createElement('div');
            title.className = 'floater-title';
            title.textContent = 'Page';

            const div1 = document.createElement('div');
            div1.className = 'floater-breadcrumb';
            div1.textContent = `Title: ${page.title || 'Untitled'}`

            const div2 = document.createElement('div');
            div2.className = 'floater-breadcrumb';
            div2.textContent = `Slug: ${page.slug || 'no-slug'}`;

            wrapper.append(title, div1, div2);

            return wrapper;
        }
    });

    handlers.addQuery('@preview-frame [data-wc-node-id]', {
        context: function(el) {
            const wrapper = document.createElement('div');
            wrapper.className = 'floater-form';

            const title = document.createElement('div');
            title.className = 'floater-title';
            title.textContent = 'Element';

            const breadcrumb = document.createElement('div');
            breadcrumb.className = 'floater-breadcrumb';

            // Building the breadcrumb
            const crumbparts = [];
            let currentEl = el;

            while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE) {
                crumbparts.push(currentEl.tagName.toLowerCase());
                if (currentEl.tagName.toLowerCase() === 'body') {
                    break;
                }
                currentEl = currentEl.parentElement;
            }

            breadcrumb.textContent = crumbparts.reverse().join(' > ');

            const nodeId = el.getAttribute('data-wc-node-id') || '';
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'floater-button';
            deleteButton.dataset.leftclick = 'delete-element';
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

            const crumbparts = [];
            let currentEl = el;

            while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE) {
                crumbparts.push(currentEl.tagName.toLowerCase());
                if (currentEl.tagName.toLowerCase() === 'body') {
                    break;
                }
                currentEl = currentEl.parentElement;
            }

            breadcrumb.textContent = crumbparts.reverse().join(' > ');

            wrapper.append(title, breadcrumb);
            return wrapper;
        }
    });

    const runtime = {
        frameSelector: '#preview-frame',
        docContextHandlers: new WeakMap(),
        docClickHandlers: new WeakMap(),
        docKeyHandlers: new WeakMap(),
        docMoveHandlers: new WeakMap(),
        docOutHandlers: new WeakMap(),
        docLeaveHandlers: new WeakMap(),
        watchedIframes: new WeakSet()
    };

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
        const compiledQueries = handlers.getCompiledQueries();

        // If this a text node, use its parent instead (should not happen, i think)
        if (target && target.nodeType === Node.TEXT_NODE) {
            target = target.parentElement;
        }

        // Not a node = GTFO
        if (!target || target.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }

        for (let i = 0; i < compiledQueries.length; i += 1) {
            const query = compiledQueries[i];

            // Scop length not the same = not it man
            if (query.scope.length !== context.scope.length) continue;

            // Scope comparison, support '*' as well
            let scopeOk = true;
            for (let j = 0; j < query.scope.length; j += 1) {
                if (query.scope[j] !== '*' && query.scope[j] !== context.scope[j]) {
                    scopeOk = false;
                    break;
                }
            }
            if (!scopeOk) continue;

            // In case this thing is not even valid
            if (!query.selector) continue;

            const matched = target.closest(query.selector);
            if (!matched) continue;

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

        const contextHandler = getOrCreateHandler(runtime.docContextHandlers, doc, function() {
            return function(event) {
                event.preventDefault();
                event.stopPropagation();

                let result = null;
                let point = null;
                try {
                    point = resolveClientPoint(event, frameChain);
                    result = runFloaterQueries('context', {
                        scope: scopeChain,
                        element: event.target,
                        x: point.x,
                        y: point.y,
                        event: event,
                        document: doc
                    });
                } catch (error) {
                    hideFloater();
                    return;
                }

                if (!result) {
                    hideFloater();
                    return;
                }

                showFloater(result.content, point.x, point.y, 'context');
            };
        });

        doc.removeEventListener('contextmenu', contextHandler, true);
        doc.addEventListener('contextmenu', contextHandler, true);

        const moveHandler = getOrCreateHandler(runtime.docMoveHandlers, doc, function() {
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

        const outHandler = getOrCreateHandler(runtime.docOutHandlers, doc, function() {
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

        const leaveHandler = getOrCreateHandler(runtime.docLeaveHandlers, doc, function() {
            return function() {
                if (state.mode === 'tooltip' && state.hoverDocument === doc) {
                    hideFloater();
                }
            };
        });

        doc.removeEventListener('mouseleave', leaveHandler, true);
        doc.addEventListener('mouseleave', leaveHandler, true);

        const clickHandler = getOrCreateHandler(runtime.docClickHandlers, doc, function() {
            return function(event) {
                if (doc === document && floater.contains(event.target)) {
                    return;
                }
                hideFloater();
            };
        });

        doc.removeEventListener('click', clickHandler, true);
        doc.addEventListener('click', clickHandler, true);

        const keyHandler = getOrCreateHandler(runtime.docKeyHandlers, doc, function() {
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

            if (!runtime.watchedIframes.has(iframeEl)) {
                runtime.watchedIframes.add(iframeEl);
                iframeEl.addEventListener('load', bindCurrentIframeDoc);
            }
        });
    }

    bindDocumentContext(document, [], []);

    document.addEventListener('wc:frame-rendered', function(event) {
        const detail = event.detail || {};
        const previewFrame = document.querySelector(runtime.frameSelector);
        const frameDoc = detail.frameDocument || (previewFrame ? previewFrame.contentDocument : null);
        if (!previewFrame || !frameDoc) {
            return;
        }

        bindDocumentContext(frameDoc, ['preview-frame'], [previewFrame]);
    });

    {
        const previewFrame = document.querySelector(runtime.frameSelector);
        const frameDoc = previewFrame ? previewFrame.contentDocument : null;
        if (previewFrame && frameDoc) {
            bindDocumentContext(frameDoc, ['preview-frame'], [previewFrame]);
        }
    }

    // Event delegation for floater clicks
    floater.addEventListener('mousedown', function(event) {
        const leftClicked = event.button === 0;
        const middleClicked = event.button === 1;
        const rightClicked = event.button === 2;

        const dataquery = leftClicked ? 'leftclick' :
                        ( rightClicked ? 'rightclick' :
                        ( middleClicked ? 'middleclick' : null ) );

        if (!dataquery) return;

        const clickedElement = event.target.closest('[data-' + dataquery + ']');  
        if (!clickedElement) return;

        const action = clickedElement.dataset[dataquery];
        const actionFn = handlers.getEventFn(dataquery, action);
        if (typeof actionFn === 'function') actionFn(event, clickedElement);
    });

    // Click outside or press Escape to hide floater
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
