/* EzFloater by Asciiz

+ Cool dynamic context menus and hover tooltips that is aware of iframes and DOMs and shit

+ Notes:
    + To display iframe's handlers.floater, do @<the-iframe-id-but-without-#> <the iframe element, attribute, etc>
        + For example: @screen #inside-the-screen
    + Every iframe, regardless of iframe nest level, requires a unique id
    + Freely customize the floater style in your css: #ez-floater and #ez-floater.ez-floater-active
*/

(function() {

    class Handler {
        constructor() {
            this.events = {};
            this.queries = {};
            this.state = {
                mode: null,
                hoverElement: null,
                hoverDocument: null,
                hoverScopeKey: ''
            }

            this.FLOATER_ID = 'ez-floater';
            this.FLOATER_STYLE_ID = 'ez-floater-runtime-style';
            this.floater = null;
        }

        init() {
            // Create new handlers.floater element if not exist
            this.floater = document.getElementById(this.FLOATER_ID);
            if (!this.floater) {
                this.floater = document.createElement('div');
                this.floater.id = this.FLOATER_ID;
                document.body.appendChild(this.floater);
            }

            // Create runtime style for handlers.floater if not exist
            if (document.getElementById(this.FLOATER_STYLE_ID)) return;

            const style = document.createElement('style');
            style.id = this.FLOATER_STYLE_ID;
            style.innerHTML = `
                #ez-floater {
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 2147483647;
                    opacity: 0;
                    pointer-events: none;
                }
                #ez-floater.ez-floater-active {
                    opacity: 0.8;
                    visibility: visible;
                    pointer-events: auto;
                }
            `;

            document.head.appendChild(style);

            // Event delegation for floater clicks
            this.floater.addEventListener('mousedown', function(event) {
                const clickdata = (event.button === 0) ? 'leftclick' :
                                ( (event.button === 2) ? 'rightclick' :
                                ( (event.button === 1) ? 'middleclick' :
                                ( null ) ) );

                if (!clickdata) return;

                // Find the closest element with this data attribute
                const clickedElement = event.target.closest('[data-' + clickdata + ']');  
                if (!clickedElement) return;

                const action = clickedElement.dataset[clickdata];
                const actionFn = this.getEventFn(clickdata, action);
                if (typeof actionFn === 'function') actionFn(event, clickedElement);
            });

            // Click away or press Escape to hide floater
            document.addEventListener('click', function(event) {
                if (!this.floater.contains(event.target)) this.hideFloater();
            }.bind(this));

            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') this.hideFloater();
            }.bind(this));
        }

    // Floater state management and utils

        setFloaterCoord(x, y) {
            const offset = 8;
            const maxLeft = window.innerWidth - this.floater.offsetWidth - offset;
            const maxTop = window.innerHeight - this.floater.offsetHeight - offset;

            const nextLeft = Math.min(x + offset, Math.max(offset, maxLeft));
            const nextTop = Math.min(y + offset, Math.max(offset, maxTop));

            this.floater.style.left = nextLeft + 'px';
            this.floater.style.top = nextTop + 'px';
        }

        showFloater(content, x, y, mode) {
            this.floater.replaceChildren();

            if (typeof content === 'string') {
                this.floater.textContent = content;
            } else {
                this.floater.appendChild(content);
            }

            this.state.mode = mode;
            this.floater.classList.toggle('mode-context', mode === 'context');
            this.floater.classList.add('ez-floater-active');
            this.setFloaterCoord(x, y);
        }

        hideFloater() {
            this.state.mode = null;
            this.floater.classList.remove('ez-floater-active');
            this.floater.classList.remove('mode-context');

            // Clear hover state
            this.state.hoverElement = null;
            this.state.hoverDocument = null;
            this.state.hoverScopeKey = '';
        }

    // Floater events and queries management

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

        /* addQuery's definition = {
            delegate: true/false (default true), false means needing the exact match, while true means finding closest ancestor match as well
            context: function(element, ctx) { ... } return a wrapper element for the context menu
            tooltip: function(element, ctx) { ... } return a wrapper element for the tooltip
        }*/
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
                delegate: definition.delegate !== false,
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

        getQueryCtx(query) {
            return this.queries[query] || null;
        }

        getCompiledQueries() {
            return Object.values(this.queries);
        }

    // Floater query execution

        /* execQuery's ctx = {
            mode: 'context' or 'tooltip',
            scope: array of scope tokens,
            element: the original event target element
        } */
        execQuery(ctx) {
            let target = ctx.element;
            if (!target) return null;

            const compiledQueries = handlers.getCompiledQueries();

            // If this a text node, use its parent instead (should not happen, i think)
            if (target && target.nodeType === Node.TEXT_NODE) {
                target = target.parentElement;
            }

            // Not a node = GTFO
            if (!target || target.nodeType !== Node.ELEMENT_NODE) {
                return null;
            }

            // Iterate through all compiled queries to find the match
            for (let i = 0; i < compiledQueries.length; i += 1) {
                const query = compiledQueries[i];

                // This thing is not even a valid query object
                if (!query.selector) continue;

                // Scop length not the same = not it man
                if (query.scope.length !== ctx.scope.length) continue;

                // Scope comparison, support '*' as well
                let scopeOk = true;
                for (let j = 0; j < query.scope.length; j += 1) {
                    if (query.scope[j] !== '*' && query.scope[j] !== ctx.scope[j]) {
                        scopeOk = false;
                        break;
                    }
                }
                if (!scopeOk) continue;


                // Find the matched element
                const matched = query.delegate === false
                    ? (target.matches(query.selector) ? target : null)
                    : target.closest(query.selector);
                if (!matched) continue;

                // Run either context or tooltip mode function, if exists
                const runFn = ctx.mode === 'context' ? query.context : query.tooltip;
                if (typeof runFn !== 'function') continue; // should not happen

                const content = runFn(matched, ctx);
                if (!content) return null;

                return {
                    query: query,     // The matched query object
                    matched: matched, // The matched element
                    content: content  // The content to show in floater
                };
            }

            return null;
        }
    }
    const handlers = new Handler();
    handlers.init();

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

    // Getting the real clientX/Y by accumulating offsets from all frames in the chain
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
                    result = handlers.execQuery({
                        scope: scopeChain,
                        element: event.target,
                        event: event,
                        document: doc,
                        mode: 'context'
                    });
                } catch (error) {
                    handlers.hideFloater();
                    return;
                }

                if (!result) {
                    handlers.hideFloater();
                    return;
                }

                handlers.showFloater(result.content, point.x, point.y, 'context');
            };
        });

        doc.removeEventListener('contextmenu', contextHandler, true);
        doc.addEventListener('contextmenu', contextHandler, true);

        const moveHandler = getOrCreateHandler(runtime.docMoveHandlers, doc, function() {
            return function(event) {
                if (handlers.state.mode === 'context') {
                    return;
                }

                const point = resolveClientPoint(event, frameChain);
                const result = handlers.execQuery({
                    scope: scopeChain,
                    element: event.target,
                    mode: 'tooltip'
                });

                if (!result) {
                    if (handlers.state.mode === 'tooltip') {
                        handlers.hideFloater();
                    }
                    return;
                }

                const scopeKey = scopeChain.join('>');
                const isSameHoverTarget =
                    handlers.state.mode === 'tooltip' &&
                    handlers.state.hoverElement === result.matched &&
                    handlers.state.hoverDocument === doc &&
                    handlers.state.hoverScopeKey === scopeKey;

                if (!isSameHoverTarget) {
                    handlers.showFloater(result.content, point.x, point.y, 'tooltip');
                } else {
                    handlers.setFloaterCoord(point.x, point.y);
                }

                handlers.state.hoverElement = result.matched;
                handlers.state.hoverDocument = doc;
                handlers.state.hoverScopeKey = scopeKey;
            };
        });

        doc.removeEventListener('mousemove', moveHandler, true);
        doc.addEventListener('mousemove', moveHandler, true);

        const outHandler = getOrCreateHandler(runtime.docOutHandlers, doc, function() {
            return function(event) {
                if (handlers.state.mode !== 'tooltip' || handlers.state.hoverDocument !== doc || !handlers.state.hoverElement) {
                    return;
                }

                const nextTarget = event.relatedTarget;
                if (nextTarget && handlers.state.hoverElement.contains(nextTarget)) {
                    return;
                }

                handlers.hideFloater();
            };
        });

        doc.removeEventListener('mouseout', outHandler, true);
        doc.addEventListener('mouseout', outHandler, true);

        const leaveHandler = getOrCreateHandler(runtime.docLeaveHandlers, doc, function() {
            return function() {
                if (handlers.state.mode === 'tooltip' && handlers.state.hoverDocument === doc) {
                    handlers.hideFloater();
                }
            };
        });

        doc.removeEventListener('mouseleave', leaveHandler, true);
        doc.addEventListener('mouseleave', leaveHandler, true);

        const clickHandler = getOrCreateHandler(runtime.docClickHandlers, doc, function() {
            return function(event) {
                if (doc === document && handlers.floater.contains(event.target)) {
                    return;
                }
                handlers.hideFloater();
            };
        });

        doc.removeEventListener('click', clickHandler, true);
        doc.addEventListener('click', clickHandler, true);

        const keyHandler = getOrCreateHandler(runtime.docKeyHandlers, doc, function() {
            return function(event) {
                if (event.key === 'Escape') {
                    handlers.hideFloater();
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





    handlers.addEventFn('leftclick', 'change-page-properties', function(event, button) {
        if (!window.WebConstruct) {
            return;
        }

        const pageId = button.dataset.pageId;
        const titleInput = handlers.floater.querySelector('#floater-page-title');
        const slugInput = handlers.floater.querySelector('#floater-page-slug');

        const result = window.WebConstruct.updatePageProperties(pageId, {
            title: titleInput ? titleInput.value : '',
            slug: slugInput ? slugInput.value : ''
        });

        if (result.ok) {
            handlers.hideFloater();
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
            handlers.hideFloater();
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








    window.EzFloater = {
        handlers: handlers
    };
})();
