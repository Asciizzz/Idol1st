# VirtualSite Rework Implementation Plan

This document defines a full replacement of:

- `resources/editor/*`
- `resources/js/global/*`

No legacy bridge is allowed. `resources/virtualsite/*` must be self-contained and run without importing or referencing old modules.

Primary product behavior: one host element, one mount call, full editor auto-constructed (iframe runtime, tabs, side panels, tool rails, overlays, floaters).

## 1. Current Structure Audit (What Must Change)

Based on full review of all files in `resources/editor` and `resources/js/global`:

1. `EzVirtualSite.js` mixes too many responsibilities:
- project store
- page lifecycle
- iframe creation
- DOM rendering
- style compilation
- script runtime
- event emission

2. `EditorRuntime.js` is a god-object over canvas placement, node selection, drag/drop, frame event binding, initial load, and editor CSS injection.

3. `ExplorerPanel.js` is a second god-object with:
- tree model creation
- explorer layout persistence
- inline rename
- create/delete flows
- drag/drop
- context menu via floater
- resizing logic

4. `RenderPage.js` combines mode switch, tool state, popup chains, keyboard shortcuts, and add/delete mutation logic.

5. Rendering strategy is mostly full-refresh (`reloadMainBody`, `load`), which is simple but not scalable for smooth UX.

6. Data model splits runtime/editor concerns awkwardly:
- core content in top-level `pages/stylesheets/scripts`
- editor-only structure hidden inside `custom.editor.*`

7. `EzFloater.js` is useful but still monolithic and global-singleton oriented, with limited explicit contracts for iframe-hosted content.

8. Styling is in one 999-line CSS file with domain concerns mixed together (shell, tabs, explorer, graph, tool popup, status).

## 2. Design Goals

1. Fully modular architecture with isolated packages inside `resources/virtualsite`.
2. Editor data and site data live in one coherent JSON document.
3. Stable IDs for page/style/script resources; visual file tree is only a management layer.
4. Tabs are simple and clear: icon + name + gray context text (example: `Page Home` + `graph mode`).
5. VSCode-like shell + Blender-like left tool rail for active page view.
6. Omnipotent floater system that can render:
- plain DOM content
- component content
- iframe content (same-origin native, cross-origin via message bridge contract)
7. Event-driven script model remains, but gains a method builder and custom event attributes.
8. Styles are editable by selector-rule form, plus raw text mode as fallback.
9. Hard separation between foundation modules and feature modules.
10. Every method documented with JSDoc.
11. Drop-and-use mounting API that bootstraps full editor UI from a host element.
12. Direct-to-builder tenant flow (no setup wizard page).
13. Domain policy with mandatory `.idolist` suffix.
14. JSON model designed for future database persistence and per-tenant isolation.
15. VSCode-style editor theming via JSON/object token maps.
16. Two non-deletable built-in themes: `default-dark` and `default-light`, with `default-dark` as initial active theme.
17. Icon-driven side panel sections: File Explorer, Site Setting, Setting.

## 3. Target Folder Structure

```text
resources/virtualsite/
  impl.md
  AIsign.md
  main.js

  bootstrap/
    VirtualSiteBuilder.js
    createWorkbenchDOM.js
    mountGuards.js

  core/
    EventBus.js
    DisposableStack.js
    CommandRegistry.js
    IdFactory.js
    DeepClone.js
    Assertions.js

  schema/
    project.schema.json
    validateProject.js
    normalizeProject.js
    migrateProject.js
    defaults.js

  store/
    ProjectStore.js
    HistoryStore.js
    selectors/
      pageSelectors.js
      styleSelectors.js
      scriptSelectors.js
      editorSelectors.js
    commands/
      pageCommands.js
      nodeCommands.js
      styleCommands.js
      scriptCommands.js
      workspaceCommands.js

  renderer/
    IframeRuntime.js
    FramePool.js
    DocumentRenderer.js
    StyleRuntime.js
    ScriptRuntime.js
    SelectionOverlay.js
    coordinate/
      frameToViewport.js
      viewportToFrame.js

  floater/
    OmniFloater.js
    FloaterHost.js
    FloaterLayouts.js
    IframeFloaterBridge.js

  workspace/
    WorkspaceTreeModel.js
    WorkspaceTreeService.js
    WorkspaceTreeValidator.js

  ui/
    shell/
      WorkbenchShell.js
      ActivityRail.js
      SidebarHost.js
      TabStrip.js
      StatusBar.js
      SidePanelNav.js
    tabs/
      TabSessionStore.js
      TabDescriptorFactory.js
    panels/
      ExplorerPanel.js
      InspectorPanel.js
      ScriptPanel.js
      StylePanel.js
      SiteSettingsPanel.js
      SettingsPanel.js
    tools/
      ToolRegistry.js
      ToolRail.js
      tools/
        SelectTool.js
        PanTool.js
        AddTool.js
        ParentTool.js
        DeleteTool.js
        EyedropTool.js
    page/
      PageViewport.js
      GraphViewport.js
      NodeTreeView.js

  theme/
    ThemeTokens.js
    ThemeRegistry.js
    ThemeValidator.js
    ThemeApplier.js
    defaultDarkTheme.js
    defaultLightTheme.js

  integration/
    SaveClient.js
    LoadClient.js
    DraftContext.js
    DomainPolicy.js
    AutosaveController.js
    BootSession.js
    persistence/
      ProjectRepository.js
      HttpProjectRepository.js
      MemoryProjectRepository.js
      TenantContext.js
      SaveConflictResolver.js
```

### 3.1 Drop-and-Use Bootstrap Contract

Single public entry:

```js
import { VirtualSiteBuilder } from "./bootstrap/VirtualSiteBuilder.js";

const builder = await VirtualSiteBuilder.mount({
  host: document.querySelector("#builder-host"),
  projectData: initialProjectJson,
  session: {
    tenantId: "tenant_001",
    userId: "user_001"
  },
  persistence: repository,
  theme: {
    initialThemeId: "default-dark",
    catalog: []
  }
});
```

Rules:

1. `host` is the only required DOM input.
2. Mount creates all internal DOM for shell, tabs, side panels, page viewport iframe host, overlays, and floaters.
3. No setup page. If no project data exists, bootstrap creates default project and opens editor immediately.
4. `mount` returns a runtime handle:
- `dispose()`
- `getStore()`
- `saveNow()`
- `setActivePage(pageId)`
 - `setTheme(themeId)`
 - `registerTheme(themeObject)`
5. Builder must support multiple instances on one page (separate host roots, isolated state).
6. Builder owns cleanup of all listeners, observers, frame resources, and portals on `dispose()`.

## 4. Unified JSON Model (Core + Editor Data Together)

Use one versioned document:

```json
{
  "version": 2,
  "tenant": {
    "tenantId": "ten_01",
    "userId": "usr_01"
  },
  "project": {
    "id": "proj_01",
    "name": "My Site",
    "domain": {
      "label": "hololie",
      "suffix": "idolist",
      "fqdn": "hololie.idolist"
    }
  },
  "resources": {
    "pages": {
      "startPageId": "pg_home",
      "order": ["pg_home"],
      "byId": {
        "pg_home": {
          "id": "pg_home",
          "title": "Home",
          "slug": "home",
          "meta": {
            "seoTitle": "Home",
            "seoDescription": "",
            "visibility": "public"
          },
          "rootNodeIds": [],
          "nodeById": {},
          "includes": {
            "styleIds": ["st_global"],
            "scriptIds": ["sc_global"]
          },
          "activeNodeId": null
        }
      }
    },
    "styles": {
      "byId": {
        "st_global": {
          "id": "st_global",
          "name": "global",
          "rules": [
            { "selector": "body", "declarations": { "margin": "0" } }
          ]
        }
      }
    },
    "scripts": {
      "byId": {
        "sc_global": {
          "id": "sc_global",
          "name": "global",
          "variables": {},
          "actions": {
            "onClickMain": "console.log('clicked');"
          },
          "events": {
            "click": [
              {
                "selector": "#main",
                "action": "onClickMain",
                "attrs": { "capture": false, "once": false, "passive": false }
              }
            ]
          }
        }
      }
    }
  },
  "editor": {
    "theme": {
      "activeThemeId": "default-dark",
      "catalog": {
        "default-dark": {
          "id": "default-dark",
          "name": "Default Dark",
          "kind": "builtin",
          "tokens": {
            "editor.background": "#111215",
            "editor.foreground": "#e4e7ec",
            "panel.background": "#181a1f",
            "panel.border": "#2a2f3a",
            "tab.activeBackground": "#1f2430",
            "tab.inactiveBackground": "#171b24",
            "statusbar.background": "#0f1115",
            "accent.primary": "#4f7cff"
          }
        },
        "default-light": {
          "id": "default-light",
          "name": "Default Light",
          "kind": "builtin",
          "tokens": {
            "editor.background": "#f3f5f9",
            "editor.foreground": "#1c2430",
            "panel.background": "#ffffff",
            "panel.border": "#d6dbe6",
            "tab.activeBackground": "#ffffff",
            "tab.inactiveBackground": "#e8edf6",
            "statusbar.background": "#dde3ef",
            "accent.primary": "#3056d8"
          }
        }
      }
    },
    "workspaceTree": {
      "rootId": "wf_root",
      "foldersById": {
        "wf_root": { "id": "wf_root", "name": "root", "parentId": null, "locked": true },
        "wf_pages": { "id": "wf_pages", "name": "pages", "parentId": "wf_root", "locked": true },
        "wf_styles": { "id": "wf_styles", "name": "styles", "parentId": "wf_root", "locked": true },
        "wf_scripts": { "id": "wf_scripts", "name": "scripts", "parentId": "wf_root", "locked": true }
      },
      "entriesById": {
        "we_page_home": { "id": "we_page_home", "kind": "page", "refId": "pg_home", "parentFolderId": "wf_pages" }
      },
      "collapsedFolderIds": []
    },
    "graph": {
      "nodeGraphByNodeId": {}
    },
    "tabs": {
      "activeTabId": null,
      "openTabs": []
    },
    "ui": {
      "leftPanelWidth": 22,
      "activePanelKey": "explorer",
      "panelOrder": ["explorer", "siteSetting", "setting"],
      "activeInspectorPanelKey": "siteSetting",
      "viewportModeByPageId": {
        "pg_home": "view"
      }
    }
  }
}
```

### Data Model Rules

1. All references are ID-based (`pageId`, `styleId`, `scriptId`), never name-based.
2. Workspace tree only controls organization; it never changes content includes automatically.
3. Includes are stable IDs, so rename never breaks links.
4. `editor` block is first-class and versioned, not hidden in `custom`.
5. `version` drives migration in `schema/migrateProject.js`.
6. `project.domain.suffix` is fixed to `idolist` in current policy.
7. `project.domain.fqdn` is derived from `label + "." + suffix` and not manually typed.
8. `tenant.tenantId` scopes the document owner for future persistence adapters.
9. Page-level metadata (`resources.pages.byId[*].meta`) is editable from side panel actions, no setup flow required.
10. `editor.theme.catalog.default-dark` and `editor.theme.catalog.default-light` must always exist.
11. Built-in themes (`kind: "builtin"`) are non-deletable.
12. User-created themes (`kind: "custom"`) are deletable.
13. Missing token keys fall back to active built-in theme tokens.
14. Initial active theme defaults to `default-dark` when not provided.

## 5. Module Boundaries and Responsibilities

### 5.1 Foundation (agnostic modules)

1. `core/EventBus.js`
- Typed publish/subscribe
- No DOM references

2. `store/ProjectStore.js`
- Single source of truth
- Immutable patch API
- Transaction batching

3. `store/HistoryStore.js`
- Undo/redo stacks of patch groups

4. `workspace/WorkspaceTreeModel.js`
- Pure tree operations
- No UI knowledge

5. `renderer/coordinate/*`
- Coordinate transforms only
- Reusable by floater, overlays, and tools

### 5.2 Renderer layer

1. `renderer/FramePool.js`
- Create/reuse iframe documents
- Active/inactive frame visibility

2. `renderer/DocumentRenderer.js`
- Incremental node patching
- Minimal DOM writes

3. `renderer/StyleRuntime.js`
- Apply style docs by ID
- CSS text cache

4. `renderer/ScriptRuntime.js`
- Event registry + compiled dispatch map
- Sandboxed action execution policy

5. `renderer/SelectionOverlay.js`
- Selection/hover/drop visuals decoupled from content DOM

### 5.3 Editor UI layer

1. `ui/shell/*`
- Global frame: activity rail, sidebar, tab strip, stage, status.
- Side panel navigation is icon-first with fixed section keys:
  - `explorer` (File Explorer)
  - `siteSetting` (domain/site metadata)
  - `setting` (theme and editor preferences)

2. `ui/tabs/*`
- Tab session model
- Display metadata: icon + label + context text

3. `ui/page/*`
- Page and graph surfaces
- Mode switches stored in `editor.ui.viewportModeByPageId`

4. `ui/panels/*`
- Explorer, style, script, inspector editors.
- Dedicated panels:
  - `SiteSettingsPanel` for domain/page/site fields
  - `SettingsPanel` for theme management
- Consume store selectors and commands only

5. `ui/tools/*`
- Blender-like tool rail bound to active page viewport

### 5.4 Floater layer

1. `floater/OmniFloater.js`
- Tooltip + context menu engine
- Multi-host targeting (document, iframe, custom portal)

2. `floater/IframeFloaterBridge.js`
- Normalize coordinates
- Support content source:
  - `dom`
  - `component`
  - `iframe`

### 5.5 Bootstrap layer

1. `bootstrap/VirtualSiteBuilder.js`
- Single mount API for drop-and-use integration.
- Composes store, renderer, shell, panels, and integration services.

2. `bootstrap/createWorkbenchDOM.js`
- Creates all required internal nodes inside host.
- No static HTML contract except host container.

3. `bootstrap/mountGuards.js`
- Validates host node, duplicate mount, and teardown safety.

### 5.6 Tenant and persistence layer

1. `integration/persistence/ProjectRepository.js`
- Interface for load/save APIs.
- Swappable implementation (memory, HTTP, future DB adapters).

2. `integration/TenantContext.js`
- Carries tenant/user identity into save/load calls.
- Central place for tenant-scoped audit fields.

3. `integration/DomainPolicy.js`
- Normalizes/validates domain labels.
- Enforces mandatory `.idolist` suffix.

4. `integration/AutosaveController.js`
- Debounced save scheduling.
- Retry and temporary failure handling.

### 5.7 Theme layer

1. `theme/ThemeRegistry.js`
- Registers built-in and custom themes.
- Enforces non-deletable built-ins.

2. `theme/ThemeValidator.js`
- Validates theme JSON/object token shape.
- Returns structured errors for settings panel display.

3. `theme/ThemeApplier.js`
- Maps tokens to CSS variables on editor root.
- Applies fallback tokens for missing keys.

4. `theme/defaultDarkTheme.js` and `theme/defaultLightTheme.js`
- Internal immutable presets.

## 6. Tab UX Contract (New Style)

Tab visual data shape:

```js
{
  id: "tab_page_pg_home",
  icon: "page",
  title: "Home",
  context: "view mode",
  kind: "page",
  refId: "pg_home"
}
```

Rules:

1. No legacy tab strip mode chips.
2. Each tab row shows:
- icon
- file/page name
- small gray context text (`view mode`, `graph mode`, `style`, `script`)
3. Mode switching belongs to tab body controls and command palette, not cramped tab buttons.

## 7. Blender-Like Tool Rail (Left of Active Viewport)

Recommended initial tools:

1. `Select`
2. `Pan`
3. `Add Element`
4. `Parent/Reparent`
5. `Delete`
6. `Eyedrop` (pick element under pointer, set active selection)
7. `Outline Toggle`
8. `Quick Insert` (open add command menu)

Each tool is a standalone class with shared interface:

```js
{
  id, label, icon, cursor,
  onActivate(ctx), onDeactivate(ctx),
  onPointerDown(ctx, e), onPointerMove(ctx, e), onPointerUp(ctx, e),
  onKeyDown(ctx, e)
}
```

## 8. Script Editing Model (Keep Event-Driven, Improve Authoring)

Keep current concept (`variables`, `actions`, `events`), but enforce structure:

```json
{
  "variables": {},
  "actions": {
    "methodName": "code..."
  },
  "events": {
    "click": [
      {
        "selector": ".button",
        "action": "methodName",
        "attrs": {
          "capture": false,
          "once": false,
          "passive": false,
          "throttleMs": 0,
          "debounceMs": 0
        }
      }
    ]
  }
}
```

Editor features:

1. Method list panel for `actions`.
2. Event binding table for `events`.
3. Custom attributes form (`once`, `passive`, custom flags).
4. Raw JSON fallback editor for power users.

## 9. Style Editing Model

Primary mode: selector + declaration inputs.

Data shape:

```json
{
  "id": "st_global",
  "name": "global",
  "rules": [
    {
      "selector": "body",
      "declarations": {
        "background-color": "#111",
        "color": "#f5f5f5"
      }
    }
  ]
}
```

Editor features:

1. Add/remove selector rows.
2. Add/remove property-value lines per selector.
3. Validate selector/property names.
4. Raw CSS text view with parser round-trip warnings.

### 9.1 Editor Theme System

Goal: VSCode-style theme tokens applied to builder UI (not to rendered site page content).

Theme object shape:

```json
{
  "id": "midnight-neon",
  "name": "Midnight Neon",
  "kind": "custom",
  "tokens": {
    "editor.background": "#0d1117",
    "editor.foreground": "#e6edf3",
    "panel.background": "#161b22",
    "panel.border": "#30363d",
    "tab.activeBackground": "#1f2937",
    "tab.inactiveBackground": "#111827",
    "statusbar.background": "#0b1220",
    "accent.primary": "#60a5fa"
  }
}
```

Theme source support:

1. Pass object at mount (`theme.catalog`).
2. Paste JSON text in Settings panel.
3. Drop `.json` file onto Settings panel import zone.
4. Persist custom themes inside `editor.theme.catalog`.

Behavior rules:

1. `default-dark` and `default-light` are built-in and always present.
2. Initial active theme is `default-dark`.
3. Built-in themes cannot be deleted.
4. Custom themes can be deleted.
5. Deleting active custom theme falls back to `default-dark`.
6. Invalid JSON or invalid token keys are rejected with panel error details.
7. Theme apply is live without remount.

Minimum required tokens:

1. `editor.background`
2. `editor.foreground`
3. `panel.background`
4. `panel.border`
5. `tab.activeBackground`
6. `tab.inactiveBackground`
7. `statusbar.background`
8. `accent.primary`

### 9.2 Icon-Based Side Panel Contract

Builder opens directly to editor, so page and domain management must be first-class in side panel:

1. Side panel rail items (icon + label tooltip):
- File Explorer (`explorer`)
- Site Setting (`siteSetting`)
- Setting (`setting`)

2. `SiteSettingsPanel` controls:
- Page title
- Page slug
- SEO title/description
- Visibility

3. Project domain controls:
- Domain label input (example `hololie`)
- Locked suffix display (`.idolist`)
- Computed read-only full domain preview (`hololie.idolist`)

4. Quick actions:
- Create page
- Duplicate page
- Set as start page
- Delete page

5. Settings panel controls:
- Theme picker dropdown/list
- JSON import/paste for custom theme creation
- Delete button only for custom themes
- Protected badge for `default-dark` and `default-light`

6. Domain validation behavior:
- reject invalid label chars
- lowercase normalize
- show inline error before save
- never allow suffix override in UI

## 10. Omnipotent Floater Design

### Requirements

1. Works as tooltip and context menu.
2. Can anchor to elements inside nested iframes.
3. Can render content sourced from iframe context.

### Architecture

1. `FloaterHost` keeps a top-level portal root in main window.
2. `IframeFloaterBridge` resolves pointer and anchor coordinates from frame space to viewport space.
3. `OmniFloater.show(request)` where `request.content.type` is:
- `dom`: mount existing node
- `component`: call renderer factory
- `iframe`: mount dedicated embedded iframe panel with provided URL/doc payload

### Pitfalls

1. Same-origin restriction for reading iframe DOM.
2. Focus trapping and keyboard dismissal.
3. Pointer events crossing layered iframes.
4. Scroll syncing while floater stays anchored.

### Mitigation

1. Enforce same-origin access in direct mode; fallback to message bridge for restricted frames.
2. Single global focus manager for floaters.
3. Anchor update loop via `requestAnimationFrame` while open.

## 11. Progressive Implementation Path

### Phase 0: Workspace Contracts

1. Create `resources/virtualsite/AIsign.md` referencing `resources/AIsign.md`.
2. Add coding contract:
- every method must have JSDoc block
- all public exports documented
- no hidden side effects in constructors

### Phase 1: Drop-and-Use Bootstrap Skeleton

1. Implement `VirtualSiteBuilder.mount({ host, projectData, session, persistence })`.
2. Build auto-DOM creation (`createWorkbenchDOM.js`) so no static editor HTML is required.
3. Add direct-open flow: if `projectData` missing, generate default project and open builder immediately.

### Phase 2: Core + Schema

1. Implement schema files and migration scaffolding.
2. Build `ProjectStore` with immutable patch actions.
3. Add validators for ID references and graph cycles.
4. Add domain schema validation: `project.domain.label`, fixed suffix `.idolist`, derived `fqdn`.
5. Add `tenant` schema fields for future persistence scoping.

### Phase 3: Renderer Kernel

1. Implement frame pool and page activation.
2. Implement incremental node renderer.
3. Implement style runtime.
4. Implement script runtime dispatcher index.

### Phase 4: Workbench Shell

1. Build shell layout (header/activity/sidebar/tabstrip/stage/status).
2. Introduce new tab session model with context text.
3. Wire command registry and keyboard shortcuts.

### Phase 5: Explorer + Workspace Tree

1. Build tree model service (pure data ops first).
2. Build explorer UI on top of service.
3. Add drag/drop, rename, create, delete using store commands.

### Phase 6: Page View + Tools + Graph

1. Implement viewport and selection overlay.
2. Implement tool rail and base tools.
3. Implement graph mode panel bound to node graph metadata.

### Phase 7: Style + Script Editors

1. Style form editor with raw text fallback.
2. Script event/method editor with custom attrs.
3. Live updates through store -> renderer subscriptions.

### Phase 8: Side Panel Sections (Explorer, Site Setting, Setting)

1. Build icon-first side panel rail and section switching.
2. Build `SiteSettingsPanel` for page metadata and start-page actions.
3. Add domain label editor with locked `.idolist` suffix and computed preview.
4. Add inline validation and normalization before save.

### Phase 9: Theme Engine + Settings Panel

1. Implement theme registry with two immutable built-ins.
2. Implement token-to-CSS-variable apply engine.
3. Build settings UI for:
- theme selection
- custom JSON import/paste
- delete custom theme
4. Enforce non-deletable defaults (`default-dark`, `default-light`).

### Phase 10: Omni Floater

1. Build base floater service.
2. Add iframe bridge.
3. Migrate context/tooltip usages to new API.

### Phase 11: Integration + Save

1. Replace old editor entrypoint with `resources/virtualsite/main.js`.
2. Load from `window.webConstructInitialProject`.
3. Save full unified JSON to existing endpoint.

### Phase 12: Persistence Adapter Hardening (DB-ready without DB code)

1. Define `ProjectRepository` interface and wire builder to adapter injection.
2. Implement memory adapter and HTTP adapter with the same interface.
3. Add `TenantContext` propagation on load/save.
4. Add revision token support in save contract (`expectedRevision` -> `nextRevision`).
5. Add conflict callback hooks (`onConflict`, `onRetry`, `onOfflineQueue`).

### Phase 13: Cutover

1. Remove imports of old editor/global files.
2. Ensure no references to `resources/editor` or `resources/js/global`.
3. Keep old folders as historical reference only.

## 12. Performance and Smoothness Plan

1. Batch mutations in store transaction API.
2. Diff-based DOM patch by node ID, not full body replace.
3. Cache compiled CSS per style resource.
4. Pre-index script bindings by event type.
5. Use delegated listeners per frame/type.
6. Use viewport-only rendering for large explorer trees.
7. Minimize layout thrash by using transform for overlays/floater anchors.

## 13. High-Risk Pitfalls

1. ID migration bugs when converting old names to stable IDs.
2. Divergence between workspace tree entries and resource refs.
3. Event listener leaks on page/frame switches.
4. Floater coordinate drift in nested iframe scroll contexts.
5. Undo/redo corruption if commands mutate shared references.

## 14. Verification Strategy

1. Schema validation tests:
- valid doc passes
- malformed refs fail
- cycles fail

2. Store command tests:
- page/node/style/script CRUD
- workspace move rules
- undo/redo correctness

3. Renderer tests:
- frame switching
- incremental patch
- style/script include updates

4. Floater tests:
- document anchors
- iframe anchors
- keyboard close and focus return

5. End-to-end editor tests:
- open files -> tab metadata visible
- mode switch updates context text
- save payload equals current store state
- side panel icon sections switch correctly (`explorer`, `siteSetting`, `setting`)
- theme switch updates CSS variables live
- deleting custom active theme falls back to `default-dark`
- deleting `default-dark` and `default-light` is blocked

## 15. JSDoc Requirement (Mandatory)

Every method must include:

```js
/**
 * Short purpose sentence.
 * @param {Type} paramName - Description.
 * @param {Type} [optionalParam] - Description.
 * @returns {ReturnType} What is returned.
 */
```

No undocumented methods in `resources/virtualsite/*`.

## 16. Final Build Rules

1. `virtualsite` must work without knowing old folder internals.
2. Old folders are references only, not dependencies.
3. New architecture must remain component-first:
- primitives independent
- composites built on primitives
- feature modules consume services via explicit interfaces

## 17. Future Database and Multi-Tenant Support (Detailed, No DB Code Yet)

This section defines how the design supports database persistence later without changing core editor modules.

### 17.1 Persistence abstraction contract

All editor save/load logic uses `ProjectRepository` interface only:

```ts
interface ProjectRepository {
  load(input: {
    tenantId: string;
    userId: string;
  }): Promise<{
    project: object | null;
    revision: string | null;
  }>;

  save(input: {
    tenantId: string;
    userId: string;
    project: object;
    expectedRevision: string | null;
  }): Promise<{
    ok: boolean;
    revision: string;
    conflict?: {
      latestProject: object;
      latestRevision: string;
    };
  }>;
}
```

Why this matters:

1. UI/store/renderer stay database-agnostic.
2. Switching from in-memory to HTTP/database needs no editor component rewrite.
3. Conflict and revision logic is standardized before DB implementation.

### 17.2 Tenant ownership model

Future server record must be unique per tenant site:

1. Key: `(tenant_id)` for one singular site per tenant in current product model.
2. Optional future extension key: `(tenant_id, site_id)` if multiple sites per tenant are introduced.
3. Every load/save call includes `tenantId` from session context.
4. Server must reject cross-tenant read/write mismatches.

### 17.3 Domain policy model

Domain input is `label` only, persisted as:

```json
{
  "project": {
    "domain": {
      "label": "hololie",
      "suffix": "idolist",
      "fqdn": "hololie.idolist"
    }
  }
}
```

Rules:

1. `suffix` fixed to `idolist` for now.
2. `fqdn` computed by domain policy utility, not hand edited.
3. `label` normalized to lowercase.
4. Invalid labels block save with explicit side-panel error.

### 17.4 Direct-to-builder startup sequence

No setup page flow:

1. Backend injects tenant session + current project JSON (or null if first use).
2. Builder mounts immediately in host.
3. If project is null, builder creates default project with:
- one page
- default style/script resource
- default workspace tree
- domain label seed from tenant/profile (if available)
4. User lands directly in editable environment.

### 17.5 Save lifecycle and autosave

Recommended flow:

1. Local edits apply instantly to `ProjectStore`.
2. `AutosaveController` debounces save requests.
3. Save payload includes full unified JSON + `expectedRevision`.
4. Server responds with `nextRevision`.
5. Store updates local revision on success.
6. `editor.theme` state persists with the same project JSON so tenant theme preference survives sessions.

If conflict:

1. Repository returns `conflict` object.
2. UI shows conflict status.
3. User chooses:
- keep local and force overwrite
- reload server version
- manual diff/merge (future enhancement)

### 17.6 Schema evolution and compatibility

1. `version` field is mandatory.
2. `schema/migrateProject.js` upgrades old snapshots before mount.
3. Migration runs in this order:
- parse raw JSON
- structural normalize
- versioned migrations
- validate
- mount
4. Failed migration should not crash editor silently; show recoverable error panel.

### 17.7 Recommended future database table shape (reference only)

Example logical record:

```json
{
  "tenant_id": "ten_01",
  "project_json": { "...": "..." },
  "revision": "42",
  "updated_at": "2026-05-20T10:00:00Z",
  "updated_by_user_id": "usr_01"
}
```

The editor never depends on this table schema directly. Only repository adapters do.

## 18. Implementation Progress Update: Node Editing Workspace (Completed in Current Iteration)

This section documents the implementation path and decisions for the first real node-authoring workflow. It addresses:

1. actionable tool rail behavior (no placeholder buttons),
2. selection model parity closer to Blender expectations,
3. add/delete/reparent operations on actual page nodes,
4. persistent right-side inspector with resize support.

### 18.1 Shell and layout changes

1. Replaced placeholder `S/P/A/D` tool buttons with mode-based controls:
- Select mode (`Shift+W`)
- Add mode (`Shift+A`)
- Delete mode (`Shift+D`)

2. Added dedicated right inspector column in workbench grid:
- always visible for page tabs (view + graph)
- hidden for style/script tabs
- draggable width using a vertical resizer
- min width: `1vw`, max width: `35vw`

3. Inspector width persists in editor state:
- `editor.ui.rightPanelWidth`

### 18.2 State model upgrades

Page state now supports multi-selection directly:

```json
{
  "activeNodeId": "n_1",
  "activeNodeIds": ["n_1", "n_4"]
}
```

Rules:

1. `activeNodeId` mirrors first entry in `activeNodeIds` for compatibility.
2. Normalization backfills `activeNodeIds` from legacy `activeNodeId` when needed.
3. Tool modes persist in editor UI:
- `editor.ui.pageToolMode`: `select | add | delete`
- `editor.ui.deleteMode`: `single | branch`

### 18.3 Selection behavior implemented

In Select mode:

1. Click node:
- selects one node
- clears prior multi-selection

2. `Ctrl + Click` node:
- toggles node in selection array

3. Click on empty page surface:
- clears selection

4. Selection visualization:
- selected nodes render with editor outline inside iframe

### 18.4 Right inspector behavior implemented

Inspector characteristics:

1. Always mounted for page workspace (including graph mode).
2. Shows page summary + current tool/delete mode.
3. If no selected node:
- shows page-level context and quick action to add root node.
4. For each selected node:
- edit `tag`
- edit `text` only when node has no children (disabled otherwise)
- edit attributes as key/value rows
- add child node
- focus only that node

### 18.5 Add-node behavior implemented

In Add mode:

1. Click node:
- create child `div` node under clicked node

2. Click empty surface:
- create root `div` node

3. New node becomes active selection.

### 18.6 Delete behavior implemented

Delete mode supports two strategies:

1. `single`:
- delete clicked node
- reparent its children to node parent (or root if no parent)

2. `branch`:
- delete clicked node and all descendants

Switching strategy:

1. Header button (`Delete: single/branch`)
2. Keyboard shortcut while in Delete mode: `D`

### 18.7 Drag-to-reparent behavior implemented

In Select mode:

1. Nodes are draggable.
2. Drop target must be valid by rules below.
3. Reparent operation moves current selection (or drag source if selection empty).

Ancestor restriction enforcement:

1. If any moved node is an ancestor of drop target, drop is rejected.
2. If moved set includes both ancestor + descendant, only highest selected roots move.

Visual feedback:

1. Valid drop target receives dashed drop outline during drag-over.

### 18.8 Shortcuts implemented

1. `Shift+W`: Select mode
2. `Shift+A`: Add mode
3. `Shift+D`: Delete mode
4. `D` (while Delete mode active): toggle `single/branch`

Input safety:

1. Shortcuts are ignored while typing in `input/textarea/select/contenteditable`.

### 18.9 Module responsibilities added

1. `ui/panels/NodeInspectorPanel.js`
- dedicated right-side node inspector UI
- no renderer/tree mutation ownership

2. `renderer/IframeRuntime.js`
- now emits normalized interaction events for editor host
- drop validation callback contract

3. `bootstrap/VirtualSiteBuilder.js`
- central orchestration for node mutations and tool state
- keeps tree mutation rules consolidated in builder domain logic

### 18.10 Current limitations (explicit)

1. Graph panel is still read-only for direct graph selection/drag.
2. No geometric/pixel transform tools yet (this iteration is DOM tree authoring first).
3. No undo/redo command wrapping for node operations yet.

These are planned next-layer improvements, not regressions.

### 18.11 Behavior corrections applied after validation round

To match expected Blender-like interaction semantics more closely, the following corrections were implemented:

1. Removed stage-header tool toggling buttons.
2. Tool activation is now left-rail driven only.
3. Delete tool left button now acts as mode selector + delete strategy toggler:
- first activation enters delete mode
- re-click while already active toggles:
  - `single` (red)
  - `branch` (purple)

4. Added explicit delete mode text on the delete tool button (`delete:single` / `delete:branch`).

5. Body root baseline:
- introduced virtual body root id (`__body__`) in normalized page data
- body is non-selectable and non-deletable
- clicking empty body area clears selection

6. Add mode now opens an element picker popup instead of instant default node creation.
- click target can be body or any node
- popup provides common HTML element options

7. Overlap click selection cycling:
- plain click cycles outermost -> innermost for overlapping ancestor stack
- repeated click on same overlap region advances cycle
- `Shift + click` on overlap selects full ancestor chain in one action

8. Selected-node outlines now use 12 distinct level colors (depth mod 12) for quick visual differentiation.

### 18.12 Interaction reliability and UX stabilization (latest pass)

This pass addresses concrete breakpoints reported during live usage and refines the editor behavior to match expected workflow:

1. Delete mode labels were shortened to avoid overflow:
- inactive: `delete`
- active: `single` or `branch`

2. `Shift + D` now behaves as fast toggle:
- if current tool is not delete -> switch to delete
- if current tool is delete -> toggle `single <-> branch`

3. Root-add flow removed from inspector UI:
- no `Add Root Node` button
- body remains the implicit and permanent root

4. Add menu was reworked from modal grid into a compact context-style list:
- section heading
- separator line
- vertical list items
- no button border/radius/background styling
- anchored to pointer position from iframe click

5. Body-target add behavior is explicit:
- add mode click on body/empty surface opens add menu with `target: body`

6. Iframe interaction capture was hardened to fix non-responsive select/delete:
- click handlers now run in capture phase
- robust target resolution handles text-node targets
- editor interactions call `preventDefault` + `stopPropagation` in tool modes
- avoids page scripts swallowing selection/delete clicks

7. Selection outline visibility was reinforced:
- `!important` outline + inset box-shadow for selected nodes
- preserves 12-color depth cycling while resisting page-style overrides

8. Tool cursor feedback was added inside iframe:
- select: default cursor
- add: copy cursor
- delete: not-allowed cursor
