# VirtualSite + Editor Deep Guide (Codex Fast-Start)

This document explains how the current VirtualSite editor works end-to-end so a fresh Codex session can quickly modify it safely.

## 1. What this project is

- Stack: Laravel backend + Vite frontend.
- Main runtime: `window.EzVirtualSite` (iframe-based multi-page virtual site engine).
- Main UI: custom editor modules in `resources/editor/*.js`.
- Primary entry route: `GET /editor`.

## 2. Runtime flow (request -> editor UI -> save)

1. Laravel serves `resources/views/editor.blade.php` through `AuthEditorController@showEditor`.
2. Blade injects globals:
- `window.creatorDraft`
- `window.creatorSaveUrl`
- `window.webConstructInitialProject`
- `window.webConstructInitialProjectUrl`
3. Vite loads `resources/js/app.js`, which includes `resources/editor/main.js`.
4. `main.js` creates `EditorApp` and calls `init()`.
5. `EditorApp` wires all subsystems:
- `EditorBus`
- `EditorRuntime`
- `TabManager`
- `ExplorerPanel`
- `SaveService`
6. `EditorRuntime.init()` creates `new EzVirtualSite()`, sets host + data, calls `init()`, and emits `editor:ready`.
7. `EditorApp.bootstrapDefaultTabs()` opens an initial page tab.
8. User edits pages/styles/scripts in tabs and explorer.
9. Save button triggers `SaveService.saveProject()` -> POST `/editor/save` with `project_json`.
10. Backend writes JSON draft to `storage/app/private/site-drafts/<owner>_<subdomain>.json`.

## 3. Backend pieces

- Routes: `routes/web.php`
- Controller actually used by routes: `app/Http/Controllers/AuthEditorController.php`
- Legacy/alternate controller with similar behavior: `app/Http/Controllers/SiteCreatorController.php`

Important: routes currently point to `AuthEditorController`, not `SiteCreatorController`.

## 4. Core frontend architecture

### `resources/editor/main.js`
- Bootstraps editor and catches init errors.

### `resources/editor/EditorApp.js`
- Composition root for the editor.
- Asserts required DOM mounts exist.
- Coordinates startup order:
1. tabs + save service + status bar bindings
2. runtime init
3. explorer init
4. default tab opening

Notable methods:
- `init()`
- `bindStatusBar()`
- `bootstrapDefaultTabs()`

### `resources/editor/constants.js`
- Event names (`BUS.*`), tab kinds, DnD MIME type.
- Change here carefully; many modules depend on these string contracts.

### `resources/editor/EditorBus.js`
- Tiny pub/sub for internal editor events.
- No persistence, no replay, no once-handlers.

## 5. VirtualSite runtime integration

### `resources/editor/EditorRuntime.js`
Bridge between editor UI and `EzVirtualSite`.

Responsibilities:
- Initialize `EzVirtualSite` with initial JSON.
- React to runtime DOM events (`ezvs:*`) and emit editor bus events.
- Manage canvas placement/parking across tabs.
- Handle node selection decorations (`data-vs-selected`).
- Handle iframe drag/drop reparenting (`site.reparentNode`).
- Node helpers for add/delete/select root.

Notable methods:
- `init()`
- `activatePage(pageId)`
- `refreshFrameBindings()`
- `refreshSelectionDecorations()`
- `addNodeUnderSelection(definition)`
- `deleteSelectedNode(mode)`
- `loadInitialProject()`

Hotspot:
- Frame event binding logic (`refreshFrameBindings`) is critical for cross-page iframe interactivity.

### `resources/js/global/EzVirtualSite.js`
The data + rendering engine.

Key APIs heavily used by editor:
- Pages: `listPages`, `addPage`, `removePage`, `updatePage`, `changePage`, `getPageFrame`
- Nodes: `addNode`, `readNode`, `writeNode`, `reparentNode`, `deleteNode`
- Styles: `listStylesheets`, `getStylesheet`, `setStylesheet`, `removeStylesheet`
- Scripts: `addScript`, `getScript`, `removeScript`
- Includes: `addPageInclude`, `removePageInclude`, `getPageIncludes`
- Custom data storage: `setCustomData/getCustomData/removeCustomData`

Runtime events emitted on `document`:
- `ezvs:pages-changed`
- `ezvs:page-selected`
- `ezvs:page-content-changed`
- `ezvs:custom-data-changed`

## 6. Tabs and renderers

### `resources/editor/TabManager.js`
- Owns tab lifecycle and activation.
- Creates tabs for `page:*`, `style:*`, `script:*`.
- Syncs open tabs when assets/pages are renamed/deleted.

Notable methods:
- `openPageTab`, `openStyleTab`, `openScriptTab`
- `activateTab`, `closeTab`
- `syncPageTabTitles`, `syncStyleTabs`, `syncScriptTabs`

### `resources/editor/Tab.js`
- UI shell for tab button + panel.
- Delegates behavior to renderer (`mount/activate/deactivate/destroy`).
- Supports page mode indicator strip (View/Graph).

### `resources/editor/RenderPage.js`
Page editing mode + graph mode toggle.

Features:
- Tool rail: `cursor`, `add`, `delete`
- Keyboard shortcuts: `Shift+W`, `Shift+A`, `Shift+X`
- Popup chain for Add menu (nested submenu panels)
- Search-based add action picker
- Delete popup (`single` vs `branch`)

Notable methods:
- `syncModeUI()` (page vs graph)
- `openAddPopup`, `renderAddPopup`, `renderAddSearchPopup`
- `executeAddAction(actionId, payload)`
- `handlePopupClick`, `handleKeyDown`

Hotspots:
- Popup state machine (`popupState.kind/search/chainPath/query`)
- Action contract: currently only `actionId` starting with `add.` is executed.

### `resources/editor/RenderGraph.js`
- Read-only hierarchical tree view of page nodes.
- Re-renders on page/content/selection events.

### `resources/editor/RenderStyle.js`
- Textarea editor for stylesheet JSON/CSS-object conversion.
- Applies via `site.setStylesheet`.

Risk note:
- `cssTextToObject` is intentionally simple; complex CSS parsing is not supported.

### `resources/editor/RenderScript.js`
- Textarea JSON editor for script objects.
- Applies via `site.addScript` after `JSON.parse`.

Risk note:
- Parse errors are silently ignored; no user-facing error yet.

## 7. Explorer subsystem

### `resources/editor/ExplorerPanel.js`
Largest and most feature-dense module.

Responsibilities:
- Sidebar open/close + resize handle.
- Tree model from pages/styles/scripts + custom folders.
- File placement persistence in custom data: `editor.explorer.layout`.
- Drag/drop reparenting of explorer rows.
- Create menu (+), context menu (rename/delete), inline rename.
- Opens tabs for page/style/script nodes.

Core method families:
- Tree/model: `buildTreeModel`, `renderTree`, `renderNode`
- Layout persistence: `getLayout`, `saveLayout`, `ensureLayout`, `cleanupLayoutForMissingFiles`
- DnD: `onRowDragStart`, `onRowDragOver`, `onRowDrop`, `reparentLayoutNode`
- File operations: `renameEntry`, `deleteEntry`, `renameStylesheet`, `renameScript`
- UX: `setupFloater`, `buildContextMenu`, `initResize`

Hotspots:
- Any rename/delete behavior typically touches explorer + tab sync + includes update.
- Layout schema in custom data must stay backward compatible.

## 8. Add popup and selection model

### `resources/editor/PageToolModel.js`
- Defines `ADD_MENU_SCHEMA`.
- Provides pure helpers for menu flatten/filter/navigation.

Notable functions:
- `flattenActionItems(schema)`
- `filterActionsByQuery(schema, query)`
- `findMenuByPath(schema, path)`
- `normalizeActiveNodeId(nodeId, nodes)`

Tests:
- `tests/editor/popupChainModel.test.js`
- `tests/editor/selectionModel.test.js`

These tests are fast sanity checks for popup-chain and selection normalization primitives.

## 9. Utilities

### `resources/editor/utils.js`
- `escapeHTML`
- `slugify`
- `uniqueName`
- `cssObjectToText`
- `cssTextToObject`

Notes:
- `uniqueName` is imported in ExplorerPanel and is useful when adding new creation flows.

## 10. Save and persistence behavior

### `resources/editor/SaveService.js`
- Reads project JSON from `site.getDataJSON()`.
- Sends `{ project_json }` to `window.creatorSaveUrl`.
- Emits status on bus and updates statusbar.

Backend persistence:
- Draft stored under `storage/app/private/site-drafts/`.
- Filename derived from owner/session + subdomain.

## 11. High-value extension points

1. Add new page tools
- File: `RenderPage.js`
- Add tool button + popup mode + execute handler branch.

2. Add new add-menu actions
- File: `PageToolModel.js` (`ADD_MENU_SCHEMA`)
- Ensure `executeAddAction` can map new payload/action contract.

3. Improve script/style editor UX
- Files: `RenderScript.js`, `RenderStyle.js`
- Add validation errors, linting, prettify actions.

4. Explorer features
- File: `ExplorerPanel.js`
- Good place for bulk ops, duplicate page/style/script, multi-select.

5. Runtime data contracts
- File: `EzVirtualSite.js`
- Keep emitted events and shape compatibility stable; many modules depend on it.

6. Save pipeline
- Files: `SaveService.js`, `AuthEditorController.php`
- Add versioning, autosave, conflict detection, or snapshots.

## 12. Fragile/important invariants

- Tab IDs are canonical:
- `page:<pageId>`
- `style:<name>`
- `script:<name>`
- Node identity in iframes depends on `data-vs-node-id`.
- Explorer layout core folders must stay locked: `root/pages/styles/scripts`.
- `EzVirtualSite` emits DOM events; editor relies on those for refresh.
- `RenderPage` popup relies on pointer tracking across host + iframe documents.

## 13. Fast-start checklist for a new Codex chat

1. Read these first:
- `resources/editor/EditorApp.js`
- `resources/editor/EditorRuntime.js`
- `resources/editor/ExplorerPanel.js`
- `resources/editor/RenderPage.js`
- `resources/js/global/EzVirtualSite.js`

2. Confirm route/controller path:
- `routes/web.php`
- `app/Http/Controllers/AuthEditorController.php`

3. Run tests:
- `npm run test`

4. If changing popup/add/selection logic, run and update:
- `tests/editor/popupChainModel.test.js`
- `tests/editor/selectionModel.test.js`

## 14. Suggested next docs to add later

- Data shape spec for `project_json` and `custom.editor.explorer.layout`
- Event contract table (`ezvs:*` and `editor:*`)
- A short “how to add new tool in 15 minutes” recipe
