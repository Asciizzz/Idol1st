
(function() {
	const sidebarButtons = document.querySelector('#sidebar-buttons');
	const sidebarContent = document.querySelector('#sidebar-content');

	if (!sidebarButtons || !sidebarContent) {
		return;
	}

	let activeButton = null;
	let activeSection = null;

	// ============= Utilities =============

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	// ============= Sidebar Configuration =============

	const sidebarSections = {
		"pages": {
			icon: 'Pg',
			label: 'Pages',
			title: 'Pages',
            render: function(panelBody) {
                if (!window.WebConstruct) {
                    return;
                }

                const pages = window.WebConstruct.getPages();
                const currentPageId = window.WebConstruct.getCurrentPageId();

                panelBody.replaceChildren();

                const actions = document.createElement('div');
                actions.className = 'pages-actions';
                actions.innerHTML = '<button class="pages-create-button" type="button" data-action="create-page">+ New Page</button>';
                panelBody.appendChild(actions);

                const list = document.createElement('div');
                list.className = 'pages-list';

                pages.forEach(function(page) {
                    const safeTitle = escapeHtml(page.title);
                    const safeSlug = escapeHtml(page.slug);

                    const item = document.createElement('div');
                    item.className = 'page-item' + (page.id === currentPageId ? ' is-current' : '');
                    item.dataset.pageId = page.id;

                    item.innerHTML = `
                        <div class="page-main">
                            <div class="page-title">${safeTitle}</div>
                            <div class="page-slug">/${safeSlug}</div>
                        </div>
                        <div class="page-actions">
                            <button class="page-action-button" type="button" data-action="check-page" data-page-id="${page.id}">Check</button>
                            <button class="page-action-button danger" type="button" data-action="delete-page" data-page-id="${page.id}">Delete</button>
                        </div>
                    `;

                    list.appendChild(item);
                });

                panelBody.appendChild(list);
            },
		},
        "view": {
			icon: 'Vw',
			label: 'View',
			title: 'View',
            marginBottom: "1rem",
			render: function(panelBody) {
				panelBody.replaceChildren();
				const placeholder = document.createElement('div');
				placeholder.className = 'panel-placeholder';
				placeholder.textContent = 'Templates coming soon...';
					panelBody.appendChild(placeholder);
			}
		},
        "templates": {
			icon: 'Tm',
			label: 'Templates',
			title: 'Templates',
			render: function(panelBody) {
				panelBody.replaceChildren();
				const placeholder = document.createElement('div');
				placeholder.className = 'panel-placeholder';
				placeholder.textContent = 'Templates coming soon...';
					panelBody.appendChild(placeholder);
			}
		},
		"elements": {
			icon: 'El',
			label: 'Elements',
			title: 'Elements',
            marginBottom: "1rem",
			render: function(panelBody) {
				panelBody.replaceChildren();
				const placeholder = document.createElement('div');
				placeholder.className = 'panel-placeholder';
				placeholder.textContent = 'Elements coming soon...';
					panelBody.appendChild(placeholder);
			}
		},
		"stylesheets": {
			icon: 'Cs',
			label: 'Styles',
			title: 'Stylesheets',
			width: '20%',
            render: function(panelBody) {
                panelBody.replaceChildren();
                const placeholder = document.createElement('div');
                placeholder.className = 'panel-placeholder';
                placeholder.textContent = 'Stylesheets editor coming soon...';
                    panelBody.appendChild(placeholder);
            },
		},
		"scripts": {
			icon: 'Js',
			label: 'Scripts',
			title: 'Scripts',
            marginBottom: "1rem",
            render: function(panelBody) {
                panelBody.replaceChildren();
                const placeholder = document.createElement('div');
                placeholder.className = 'panel-placeholder';
                placeholder.textContent = 'Scripts editor coming soon...';
                    panelBody.appendChild(placeholder);
            }
		},
        "assets": {
			icon: 'As',
			label: 'Assets',
			title: 'Assets',
            render: function(panelBody) {
                panelBody.replaceChildren();
                const placeholder = document.createElement('div');
                placeholder.className = 'panel-placeholder';
                placeholder.textContent = 'Assets manager coming soon...';
                    panelBody.appendChild(placeholder);
            }
        }
	};

	// ============= Panel Management =============

	function renderPanel(sectionKey, title) {
		sidebarContent.innerHTML = `
			<div class="sidebar-panel-header">${escapeHtml(title)}</div>
			<div class="sidebar-panel-body" data-section="${escapeHtml(sectionKey)}"></div>
		`;

		const panelBody = sidebarContent.querySelector('.sidebar-panel-body');
		const renderer = sidebarSections[sectionKey]?.render;
		if (renderer) {
			renderer(panelBody);
		}
	}

	function openPanelFor(button) {
		const sectionKey = button.dataset.section;
		const title = button.dataset.title;
		const section = sidebarSections[sectionKey];

		if (!sectionKey || !title) {
			return;
		}

		if (activeButton) {
			activeButton.classList.remove('is-active');
		}

		activeButton = button;
		activeButton.classList.add('is-active');

		// Optional per-section width; empty means use default CSS width.
		sidebarContent.style.width = section && section.width ? section.width : '';

		renderPanel(sectionKey, title);
		activeSection = sectionKey;

		sidebarContent.classList.add('is-open');
		sidebarContent.setAttribute('aria-hidden', 'false');
	}

	function closePanel() {
		if (activeButton) {
			activeButton.classList.remove('is-active');
			activeButton = null;
		}

		sidebarContent.classList.remove('is-open');
		sidebarContent.setAttribute('aria-hidden', 'true');
		activeSection = null;
	}

	// ============= Handlers =============

    // Can be pretty much any attribute
	const handlers = {
		'create-page': function() {
			if (window.WebConstruct) {
				window.WebConstruct.createPage('New Page', 'new-page');
			}
		},

		'check-page': function(target) {
			const pageId = target.dataset.pageId;
			if (window.WebConstruct && pageId) {
				window.WebConstruct.setCurrentPage(pageId);
			}
		},

		'delete-page': function(target) {
			const pageId = target.dataset.pageId;
			if (window.WebConstruct && pageId) {
				window.WebConstruct.deletePage(pageId);
			}
		}
	};

	function handlePanelClick(event) {
		const actionButton = event.target.closest('[data-action]');
		if (!actionButton) {
			return;
		}

		const action = actionButton.dataset.action;
		const handler = handlers[action];
		if (handler) {
			handler(actionButton);
		}
	}

	function handleSidebarButtonClick(button) {
		const isSameButton = activeButton === button;
		const isOpen = sidebarContent.classList.contains('is-open');

		if (isSameButton && isOpen) {
			closePanel();
			return;
		}

		openPanelFor(button);
	}

	// ============= Initialization =============

	function initializeSidebar() {
		Object.entries(sidebarSections).forEach(function(entry) {
			const sectionId = entry[0];
			const section = entry[1];

			// Build one sidebar button from section config.
			const button = document.createElement('button');
			button.className = 'sidebar-button';
			button.type = 'button';
			button.dataset.section = sectionId;
			button.dataset.title = section.title;
			button.setAttribute('aria-controls', 'sidebar-content');

			const icon = document.createElement('span');
			icon.className = 'sidebar-icon';
			icon.textContent = section.icon;

			const label = document.createElement('span');
			label.className = 'sidebar-label';
			label.textContent = section.label;

			button.appendChild(icon);
			button.appendChild(label);

            if (section.marginBottom) {
                button.style.marginBottom = section.marginBottom;
            }

			sidebarButtons.appendChild(button);
			button.addEventListener('click', function() {
				handleSidebarButtonClick(button);
			});
		});

		sidebarContent.addEventListener('click', handlePanelClick);

		document.addEventListener('wc:pages-changed', function() {
			if (activeSection === 'pages' && sidebarContent.classList.contains('is-open')) {
				const panelBody = sidebarContent.querySelector('.sidebar-panel-body[data-section="pages"]');
				if (panelBody && sidebarSections.pages?.render) {
					sidebarSections.pages.render(panelBody);
				}
			}
		});
	}

	initializeSidebar();

})();

