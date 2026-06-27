# Idol1st Codebase Flow

This project is a Laravel app with two visible surfaces:

- `/editor` is the graph-based site builder.
- `/admin` is a mock SaaS-style dashboard.

The editor is the core system. It loads graph data into a visual canvas, lets you edit nodes and edges, compiles that graph into HTML/CSS/JS output for preview, and can save the current graph as JSON.

## High-Level Flow

```mermaid
flowchart TD
    A[Browser opens /] --> B[Laravel redirects to /editor]
    B --> C[AuthEditorController@showEditor]
    C --> D[Resolve draft from session or default values]
    C --> E[Load initial graph from public/jsons/test.json]
    C --> F[Render resources/views/editor.blade.php]
    F --> G[resources/js/vsb.js boots the editor]
    G --> H[Deserialize graph into Agraph + typed node data]
    H --> I[Mount VsGraph canvas and VsbUI]
    I --> J[User edits nodes, edges, and properties]
    J --> K[VsbCompiler compiles preview HTML/CSS/JS]
    J --> L[POST /editor/save stores graph JSON]

    M[/admin] --> N[Render resources/views/admin.blade.php]
    N --> O[resources/js/admin.js loads mock dashboard data]
    O --> P[DashboardRenderer builds widgets]
    O --> Q[BgRenderer starts animated WebGPU background]
```

## Request Entry Points

The only Laravel routes currently wired are in [routes/web.php](routes/web.php).

- `/` redirects to `/editor`.
- `GET /editor` shows the builder.
- `POST /editor/save` stores the graph JSON.
- `GET /admin` returns the dashboard view.

There is no deeper routing layer shown here, so the app flow is intentionally shallow: browser request -> controller/view -> front-end app.

## Editor Flow

The editor starts in [resources/views/editor.blade.php](resources/views/editor.blade.php).

That view does three important things:

- Injects the CSRF token.
- Loads `resources/js/vsb.js` through Vite.
- Exposes two globals to the browser:
  - `window.__VSB_GRAPH__` for the initial graph blob.
  - `window.__VSB_DRAFT__` for the draft metadata.

The bootstrap script [resources/js/vsb.js](resources/js/vsb.js) is the editor entrypoint.

1. It reads `window.__VSB_GRAPH__`.
2. It deserializes the raw graph through `VsbJSON.read(...)`.
3. It creates the visual graph renderer `VsGraph` and mounts it into `#app`.
4. It attaches `VsbCtx` to hold selection, mode, and visibility state.
5. It attaches `VsbUI`, which adds the toolbar, preview panel, interaction handlers, and compile trigger.

## What Loads Into the Editor

The controller [app/Http/Controllers/AuthEditorController.php](app/Http/Controllers/AuthEditorController.php) provides the initial editor data.

- `resolveDraft()` tries to read `site_draft` from the session.
- If nothing is present, it falls back to a placeholder draft:
  - `project_name = Example Project`
  - `subdomain = example`
- `resolveInitialGraph()` loads [public/jsons/test.json](public/jsons/test.json) if it exists and contains a `nodes` array.
- If that file is missing or invalid, the editor starts with no graph.

Important detail: the shown code does not write `site_draft` anywhere, so the session lookup is currently a placeholder unless another part of the app sets it.

## How the Editor Canvas Works

The actual canvas is a generic visual graph engine in [resources/js/Alib/VsGraph/VsGraph.js](resources/js/Alib/VsGraph/VsGraph.js).

The important idea is:

- `Agraph` stores topology.
- `VsData` subclasses know how to render themselves.
- `VsGraph` only manages mount/unmount, camera transforms, and calling each node/edge's render hooks.

That means the graph renderer does not know what a node means. It only knows how to create DOM elements for nodes and edges that have a `VsData`-based payload.

### Core render loop

1. `VsGraph.render()` iterates over graph nodes.
2. For each node whose `data` is a `VsData` subclass, it calls that class's `createFn()` once.
3. It then calls `renderFn()` on every render pass.
4. It repeats the same process for edges.
5. Removed nodes/edges are unmounted from the DOM.
6. The camera transform is applied to the world layer.

### Camera behavior

`VsCamera` provides pan and zoom, and `VsGraph` wires mouse input directly to it.

- Drag on empty canvas to pan.
- Scroll wheel to zoom.
- Node dragging is handled inside the node data classes, not inside `VsGraph` itself.

## Graph Data Model

The base graph structure lives in [resources/js/Alib/Agraph.js](resources/js/Alib/Agraph.js).

It is a small directed graph implementation with:

- Nodes and edges stored in maps.
- Incoming and outgoing adjacency lists.
- Helpers like `addNode`, `addEdge`, `removeNode`, `removeEdge`, `outEdges`, `inEdges`, and `deserialize`.

The graph uses typed data objects from [resources/js/VirtualSiteBuilder/nodedata](resources/js/VirtualSiteBuilder/nodedata) to make nodes editable in the UI.

### Node categories

- `HTML` files
- `CSS` files
- `JS` files
- `ELEMENT` nodes for DOM structure
- `CSS_RULE` nodes for style rules
- `JS_EVENT` nodes for event handlers
- `ASSET_IMAGE` and `ASSET_AUDIO` nodes for media

Each type extends the shared node classes so it can render a specific editor card and preserve custom fields.

## Virtual Site Builder Behavior

The main editor controller for interactions is [resources/js/VirtualSiteBuilder/ui.js](resources/js/VirtualSiteBuilder/ui.js).

This is where most user behavior lives:

- Toolbar and mode switching.
- Add-node actions.
- Delete mode.
- Edge creation and validation.
- Selection state.
- Side preview panel.
- Live compile triggers.

The flow is roughly:

1. The UI initializes with the active `VsGraph` instance.
2. It sets up pointer handlers for node selection, node deletion, and edge dragging.
3. It keeps a temporary SVG path for the in-progress edge line.
4. It updates `VsbCtx` with current editor mode and toggle state.
5. It triggers compilation whenever the graph changes.

### Compile path

`VsbCompiler.compile(graph)` in [resources/js/VirtualSiteBuilder/compiler.js](resources/js/VirtualSiteBuilder/compiler.js) turns the graph into a previewable site.

It builds three outputs:

- `htmlFiles`
- `cssFiles`
- `jsFiles`

The compiler is simple and opinionated:

- CSS files are built by walking a chain of `CSS_RULE` nodes.
- JS files are built by walking `JS_EVENT` nodes attached to `JS` files and generating `DOMContentLoaded` handlers.
- HTML files are built from `HTML` roots, their included CSS/JS files, and nested `ELEMENT` trees.
- Asset nodes are rendered as `src` values for image/audio elements.

### Preview path

After compilation, `VsbCompiler.generatePreviewHtml(...)` merges the generated HTML, CSS, and JS into one preview document for the right-hand preview panel.

So the browser experience is:

- edit graph
- compile graph
- inject preview HTML into iframe/panel

not:

- edit files directly on disk

## Saving

`POST /editor/save` in [app/Http/Controllers/AuthEditorController.php](app/Http/Controllers/AuthEditorController.php) is the only persistence path shown here.

What it does:

- Validates that `graph` is an array.
- Wraps it with metadata:
  - `saved_at`
  - `draft`
- Writes JSON to `storage/app/private/site-drafts/<session>_<subdomain>.json`.

What it does not do in the shown code:

- It does not update the session draft.
- It does not export HTML/CSS/JS files to public storage.
- It does not publish a compiled site.

So right now the save path is a graph snapshot store, not a full deployment pipeline.

## Admin Flow

The admin page starts in [resources/views/admin.blade.php](resources/views/admin.blade.php).

It loads:

- `resources/css/admin.css`
- `resources/js/admin.js`
- Chart.js from a CDN
- Outfit from Google Fonts

The JavaScript flow in [resources/js/admin.js](resources/js/admin.js) is straightforward:

1. Wait for `DOMContentLoaded`.
2. Define a mock dashboard JSON payload.
3. Render the dashboard through `DashboardRenderer`.
4. Start the animated background through `BgRenderer`.

### Dashboard rendering

`DashboardRenderer` in [resources/js/AdminPanel/DashboardRenderer.js](resources/js/AdminPanel/DashboardRenderer.js) receives the dashboard JSON and creates widget cards.

- `stat_card` entries become metric cards.
- `chart` entries become Chart.js canvases.
- Width controls determine grid span.
- Each widget gets a staggered animation delay.

### Background rendering

`BgRenderer` in [resources/js/AdminPanel/BgRenderer.js](resources/js/AdminPanel/BgRenderer.js) creates a WebGPU full-screen animated background.

It is mostly decorative and does not feed data back into the app.

## Layout And Styling

The admin styling is in [resources/css/admin.css](resources/css/admin.css).

It defines:

- dark theme colors
- glass panels
- sidebar layout
- responsive widget grid
- chart card sizing
- subtle entrance animation

This page is visually separate from the builder and does not share the graph editor state.

## What To Look At First

If you want to understand the code in the fastest possible order, read it in this sequence:

1. [routes/web.php](routes/web.php)
2. [app/Http/Controllers/AuthEditorController.php](app/Http/Controllers/AuthEditorController.php)
3. [resources/views/editor.blade.php](resources/views/editor.blade.php)
4. [resources/js/vsb.js](resources/js/vsb.js)
5. [resources/js/VirtualSiteBuilder/ui.js](resources/js/VirtualSiteBuilder/ui.js)
6. [resources/js/VirtualSiteBuilder/compiler.js](resources/js/VirtualSiteBuilder/compiler.js)
7. [resources/js/Alib/VsGraph/VsGraph.js](resources/js/Alib/VsGraph/VsGraph.js)
8. [resources/js/VirtualSiteBuilder/nodedata](resources/js/VirtualSiteBuilder/nodedata)
9. [resources/views/admin.blade.php](resources/views/admin.blade.php)
10. [resources/js/admin.js](resources/js/admin.js)

## Current Gaps

A few things are clearly still in-progress rather than fully wired:

- The editor draft session data is read but not obviously written.
- The save endpoint stores JSON, but there is no deployment/export pipeline shown.
- The admin page uses mock data instead of a backend feed.
- `test.json` is the current seed graph, so the editor's starting state depends on that file.

## Mental Model

If you only keep one idea from this codebase, it should be this:

- Laravel serves the pages.
- The editor is a graph editor, not a traditional form app.
- Node data classes define the behavior of each visual card.
- The compiler turns the graph into site output for preview.
- Saving stores the graph snapshot, not a full generated site.
