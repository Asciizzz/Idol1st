# VIRTUAL SITE BUILDER (VSB) - DEFINITIVE AI ARCHITECTURE REFERENCE

**WARNING TO ALL AI AGENTS:** This document is the absolute, unquestionable source of truth for the Virtual Site Builder engine. It completely supersedes all previous rule files. If you are tasked with procedurally generating, modifying, or reading a `.json` graph for this engine, you MUST adhere to every single constraint in this file. Failure to do so will result in cyclic crashes, compiler failures, and malformed UI states. 

---

## TABLE OF CONTENTS
1. [Core Engine Philosophy & Agraph Integration](#1-core-engine-philosophy--agraph-integration)
2. [Complete Node Type Reference & JSON Schemas](#2-complete-node-type-reference--json-schemas)
3. [The Edge Engine & Topological Constraints](#3-the-edge-engine--topological-constraints)
4. [Compiler Internals (The AST Resolver)](#4-compiler-internals-the-ast-resolver)
5. [UI State Machine & Interaction Mechanics](#5-ui-state-machine--interaction-mechanics)
6. [Asset Management & Local Object URLs](#6-asset-management--local-object-urls)
7. [Procedural Generation Examples (Right vs Wrong)](#7-procedural-generation-examples-right-vs-wrong)

---

## 1. CORE ENGINE PHILOSOPHY & AGRAPH INTEGRATION

The Virtual Site Builder is built on top of a custom Directed Acyclic Graph (DAG) library called `Agraph`. Unlike traditional DOM trees which are strictly hierarchical (trees), the VSB engine utilizes a DAG to allow nodes to be shared across multiple roots. 

### Why a DAG?
In a standard website, a CSS class or a Javascript function can be applied to multiple HTML elements. In VSB, we represent this by allowing an `ELEMENT` node to connect to a `CSS_RULE` node or a `JS_EVENT` node. If we restricted this to a tree, you would have to duplicate the `CSS_RULE` for every single element. A DAG allows multiple `ELEMENT` nodes to point to the exact same `JS_EVENT` node, creating a many-to-one relationship.

### The Problem of Ownership (Edge Painting)
Because multiple branches can intersect, the compiler must know *which file* owns a specific edge. If HTML File A and HTML File B both connect to Element C, and Element C connects to Element D, how does the compiler know if Element D belongs to File A or File B?
**Solution: Edge Painting (`rootId`)**.
Every single edge in the VSB graph contains a `rootId` inside its data payload. This `rootId` is the `id` of the Root File node (`HTML`, `CSS`, or `JS`) that fundamentally owns that connection pathway. 
*   Edges forming an HTML DOM tree **MUST** have a `rootId` pointing to their parent `HTML` node.
*   Edges chaining CSS rules **MUST** have a `rootId` pointing to their parent `CSS` node.
*   Edges binding JS events **MUST** have a `rootId` pointing to their parent `JS` node.

### Legacy Migrations (`JSON.js`)
When loading a graph, the engine passes the raw JSON through a migrator. 
*   If a node has `data.canvas`, it is mutated to `data.vsgraph`.
*   If a node has `data.vsgraph`, it is mutated to `data.vsgdata`.
*   **Modern standard:** All layout data MUST be stored inside `data.vsgdata`.

---

## 2. COMPLETE NODE TYPE REFERENCE & JSON SCHEMAS

The graph wrapper dictates the entire ecosystem. The top-level schema is:
```json
{
    "label": "Project Name",
    "_nextNodeId": 1000,
    "_nextEdgeId": 1000,
    "nodes": [],
    "edges": []
}
```
*Rule: Always increment `_nextNodeId` and `_nextEdgeId` significantly higher than the highest procedural ID used.*

Every node object MUST adhere to the following baseline wrapper:
```json
{
    "id": "unique_string_id",
    "data": {
        "type": "ENUM_TYPE",
        "name": "Display Name",
        "vsgdata": { "x": 0, "y": 0, "z": 0, "collapsed": true },
        ...type_specific_properties
    }
}
```

### 2.1 Root Files (`HTML`, `CSS`, `JS`)
Root files act as the compilation entry points. They contain no specialized properties beyond the baseline.
*   `data.type`: `"HTML"`, `"CSS"`, or `"JS"`
*   `data.name`: Determines the filename. `"index"` becomes `index.html`. Spaces are replaced with underscores and forced to lowercase (`"Main Styles"` -> `main_styles.css`).

**JSON Example:**
```json
{
    "id": "n_html_index",
    "data": {
        "type": "HTML",
        "name": "index",
        "vsgdata": { "x": 0, "y": 0, "z": 0, "collapsed": false }
    }
}
```

### 2.2 The HTML DOM Element (`ELEMENT`)
Represents an HTML tag. 
*   `data.tag` (String): The HTML tag (e.g., `"div"`, `"span"`, `"img"`). Defaults to `"div"`.
*   `data.attrsText` (String): Raw attributes string injected directly into the HTML tag. Example: `"class='btn active' id='hero'"`. (Note: The compiler uses regex `/([\w-]+)\s*:\s*("[^"]*"|'[^']*')/g` to parse colons as legacy, but modern usage prefers standard raw HTML attribute formatting).
*   `data.text` (String): The innerText content of the element.
*   `data.jsEventIds` (Array): Legacy array. DO NOT USE for modern generation. Events are bound strictly through edges.

**JSON Example:**
```json
{
    "id": "e_hero_title",
    "data": {
        "type": "ELEMENT",
        "name": "Hero Title",
        "tag": "h1",
        "attrsText": "class='glow-text'",
        "text": "Welcome to VSB",
        "vsgdata": { "x": 400, "y": -100, "z": 0, "collapsed": false }
    }
}
```

### 2.3 The Stylesheet Block (`CSS_RULE`)
Represents a block of CSS declarations. It serves dual purposes: Global CSS Rule OR Inline Style.
*   `data.selector` (String): The CSS selector (e.g., `body`, `.glass-panel`, `#app`). 
*   `data.code` (String): The raw declarations (e.g., `color: red;\ndisplay: flex;`).
*   **Dual Purpose Rule:** If a `CSS_RULE` is connected via an edge from an `ELEMENT` node, the UI explicitly disables the `selector` input field and replaces it with `(Inline Style)`. The compiler completely ignores the `selector` and takes the `code` and directly injects it into the element's `style=""` attribute. If it is chained from a `CSS` file, it acts as a global rule in the stylesheet.

**JSON Example:**
```json
{
    "id": "c_glass",
    "data": {
        "type": "CSS_RULE",
        "name": "Glass Panel",
        "selector": ".glass-panel",
        "code": "background: rgba(20, 20, 30, 0.4);\nbackdrop-filter: blur(12px);\nborder-radius: 16px;",
        "vsgdata": { "x": -800, "y": 100, "z": 0, "collapsed": true }
    }
}
```

### 2.4 The Javascript Execution Block (`JS_EVENT`)
Represents an event listener.
*   `data.event` (String): The DOM event type. Supported dropdown options in UI: `"click"`, `"dblclick"`, `"pointerdown"`, `"pointerup"`, `"pointerenter"`, `"pointerleave"`, `"pointermove"`, `"input"`, `"change"`, `"keydown"`, `"keyup"`, `"submit"`, `"focus"`, `"blur"`, `"wheel"`, `"contextmenu"`, `"mouseenter"`, `"mouseleave"`, `"mousemove"`, `"mousedown"`, `"mouseup"`, `"mouseover"`.
*   `data.code` (String): The raw Javascript to execute.

**JSON Example:**
```json
{
    "id": "j_alert",
    "data": {
        "type": "JS_EVENT",
        "name": "Show Alert",
        "event": "click",
        "code": "alert('Action triggered!');\nconsole.log(event);",
        "vsgdata": { "x": 600, "y": -500, "z": 0, "collapsed": true }
    }
}
```

### 2.5 Asset Nodes (`ASSET_IMAGE` / `ASSET_AUDIO`)
Provides file source links to elements (`<img src="...">` or `<audio src="...">`).
*   `data.assetId` (String): An internal ID assigned by the UI when a user uploads a local file. The compiler uses this to fetch the `URL.createObjectURL` Blob path for local previews.
*   `data.url` (String): The physical URL string. Used as a fallback if `assetId` is null or invalid. Useful for external image links.
*   `data.filename` (String): Display name in the UI node (e.g., `"Select Avatar"`).

**JSON Example:**
```json
{
    "id": "a_hero_bg",
    "data": {
        "type": "ASSET_IMAGE",
        "name": "Hero Background",
        "url": "https://example.com/bg.png",
        "filename": "bg.png",
        "vsgdata": { "x": 800, "y": 600, "z": 0, "collapsed": true }
    }
}
```

---

## 3. THE EDGE ENGINE & TOPOLOGICAL CONSTRAINTS

The engine relies on `resources/js/virtualsitebuilder/nodedata/edge.js`. The `resolveEdgeConfig` function acts as the supreme law of the universe. If a connection is not explicitly defined in the `EDGE_CONFIG_MAP`, it throws a red line (`#ff3333`) error and logs an invalid connection. 

Every edge schema:
```json
{
    "id": "unique_edge_id",
    "srcId": "source_node_id",
    "dstId": "dest_node_id",
    "data": {
        "rootId": "owning_file_id",
        "order": 0,
        "enabled": true
    }
}
```

### 3.1 Strict Connection Matrix (`EDGE_CONFIG_MAP`)
The following are the ONLY valid `SourceType -> DestType` connections in the entire engine:

1.  **`HTML -> ELEMENT`**
    *   **Purpose:** Marks the `ELEMENT` as a root node of the HTML file body.
    *   **Rule:** Visual edge inherits `rootColor`. Handled by `showElementEdges` UI toggle.
2.  **`HTML -> CSS`**
    *   **Purpose:** Injects `<link rel="stylesheet" href="cssname.css">` into the HTML `<head>`.
    *   **Rule:** Visual edge is white dashed. `showIncludeEdges`.
3.  **`HTML -> JS`**
    *   **Purpose:** Injects `<script src="jsname.js" defer></script>` into the HTML `<head>`.
    *   **Rule:** Visual edge is white dashed. `showIncludeEdges`.
4.  **`ELEMENT -> ELEMENT`**
    *   **Purpose:** Defines DOM nesting (Child elements). The `order` property dictates the sibling insertion order.
    *   **Rule - DAG RESTRICTION:** An element node **CANNOT** have multiple parent `ELEMENT` nodes (or multiple `HTML` file parents). If `inEdges` mapping from `ELEMENT` or `HTML` > 1, the compiler throws: `"Element node cannot have multiple parents."`
5.  **`ELEMENT -> CSS_RULE`**
    *   **Purpose:** Applies the `CSS_RULE` logic as an **INLINE STYLE**. 
    *   **Rule:** Edge is dashed blue (`#3b82f6`). The CSS Rule ignores its `selector` field.
6.  **`ELEMENT -> JS_EVENT`**
    *   **Purpose:** Binds the HTML element to the global event listener logic.
    *   **Rule:** Edge is dashed yellow (`#f7df1e`).
7.  **`ELEMENT -> ASSET_IMAGE`** & **`ELEMENT -> ASSET_AUDIO`**
    *   **Purpose:** Injects the asset URL into the `src=""` attribute of the element.
    *   **Rule:** Edge is dashed pink (`#ec4899`). The UI automatically removes old asset edges if a new one is dragged onto the element (mutually exclusive singular connection).
8.  **`CSS -> CSS_RULE`**
    *   **Purpose:** Defines the entry point of the global stylesheet.
    *   **Rule:** See Cascading Chains below. Visual edge inherits `rootColor`.
9.  **`CSS_RULE -> CSS_RULE`**
    *   **Purpose:** Chains rules sequentially for compilation. 
10. **`JS -> JS_EVENT`**
    *   **Purpose:** Defines global event logic.
    *   **Rule:** A JS Event CANNOT belong to multiple JS files. If `inEdges` from `JS` nodes > 1, compiler throws: `"JS Event cannot belong to multiple JS files."`

### 3.2 The CSS Chaining Rule (CRITICAL)
Due to the cascading, order-dependent nature of CSS, `CSS_RULE` nodes **MUST NOT** be fanned out in parallel from the `CSS` root node. 
If `CSS` connects to `RuleA`, `RuleB`, and `RuleC` directly, the compiler logs: `"CSS File has multiple root rules. Picking the first branch."` and drops the rest.
**Correct Topology:**
`CSS` -> connects to -> `RuleA` -> connects to -> `RuleB` -> connects to -> `RuleC`.
This creates a single, unbroken chain that guarantees top-to-bottom compilation order. 

### 3.3 The JS Bipartite Event Binding
JS files do NOT chain. They operate as a bipartite graph.
*   `JS` -> connects to -> `EventA`, `EventB`, `EventC` (Fan-out is allowed here).
*   `Element1` -> connects to -> `EventA`.
*   `Element2` -> connects to -> `EventA`.
(Many elements can point to the same event listener).

---

## 4. COMPILER INTERNALS (THE AST RESOLVER)

Located in `compiler.js`, the `VsbCompiler.compile(graph, ctx)` static method is responsible for flattening the DAG into physical code.

### Phase 0: Graph Validation
It loops over every edge and calls `resolveEdgeConfig`. If any connection returns an `error` string (e.g. invalid direction, cyclic element parents), it logs it and visibly turns the edge red in the UI.

### Phase 1: CSS Compilation
*   Iterates over `CSS` nodes.
*   Finds the first outgoing edge to a `CSS_RULE`.
*   Enters a `while(currentNode)` loop to walk the chain.
*   Uses a `Set(visited)` to track node IDs. If a cycle is detected (`visited.has(currentNode.id)`), it breaks immediately to prevent infinite compilation loops.
*   Emits `${selector} { \n ${code} \n }`.

### Phase 2: JS Compilation
*   Iterates over `JS` nodes.
*   Emits `document.addEventListener("DOMContentLoaded", () => {`.
*   Finds all connected `JS_EVENT` nodes.
*   For each event, traces *backwards* (`inEdges`) to find connected `ELEMENT`s.
*   Generates a unique var `el_vsb_[nodeId] = document.querySelector('[data-vsb-id="[nodeId]"]');`.
*   Attaches `el.addEventListener('eventType', ...code...)`.

### Phase 3: HTML Compilation
*   Iterates over `HTML` nodes.
*   Emits `<!DOCTYPE html>...<head>`.
*   Finds connected `CSS` and `JS` files, injecting `<link>` and `<script>` tags based on their generated filenames.
*   Sorts all connected root `ELEMENT`s by their edge `order`.
*   Calls recursive `renderElement(elNode)`.
    *   Emits `<tag data-vsb-id="nodeId"`.
    *   Concatenates `attrsText`.
    *   Finds outgoing `CSS_RULE` inline styles, concatenates them into `style=""`.
    *   Finds outgoing `ASSET_` nodes, injects `src=""`.
    *   If tag is `img, input, br, hr, meta, link`, it self-closes `/>`.
    *   Recursively renders children `ELEMENT`s sorted by edge `order`.
    *   Validates JS inclusion: If an element is bound to an event, the compiler checks if the `HTML` file actually includes the parent `JS` file of that event. If missing, logs a warning.

### Preview Iframe Generation
`generatePreviewHtml` strips external `<link>` and `<script src...>` tags using Regex, and physically concatenates the compiled CSS and JS strings directly into `<style>` and `<script>` blocks in the `<head>`. This allows the iframe to render instantaneously without requiring a backend server save or network requests.

---

## 5. UI STATE MACHINE & INTERACTION MECHANICS

The `ui.js` file handles human interactions. AIs should be aware of these states to understand what the user is experiencing.

### The Context State (`ctx.mode`)
*   **`CURSOR` (Hotkey 1):** Default mode. Dragging moves nodes. Clicking file nodes (`HTML`, `CSS`, `JS`) sets them as the `ctx.selectedFileNodeId` (crucial for Edge Painting).
*   **`ADD_*` (Hotkey 2):** Spawns a node at the mouse cursor. (Submenu Hotkeys: 1=HTML, 2=CSS, 3=JS, 4=ELEMENT, 5=CSS_RULE, 6=JS_EVENT, 7=ASSET_IMAGE, 8=ASSET_AUDIO).
*   **`EDGE_ADD` (Hotkey 3 -> 1):** Click and drag from Node A to Node B. The UI validates the `stype->dtype` pairing. If valid, an edge is created, and the `rootId` is automatically assigned to `ctx.selectedFileNodeId`.
*   **`EDGE_PAINT` (Hotkey 3 -> 2):** Clicking an edge overwrites its `rootId` payload with the currently selected file node ID.
*   **`DELETE` (Hotkey 4):** Clicking nodes or edges permanently destroys them.

### UI Toggles
*   **Hotkey 5 (`n`)**: `showNodeInputs` - Expands/collapses all node textareas and property fields.
*   **Hotkey 6**: `showEdgeInputs` - Shows/hides the `order` input box on every edge.
*   **Hotkey 7**: `showEdgeErrors` - Toggles the visibility of invalid red connections.

---

## 6. ASSET MANAGEMENT & LOCAL OBJECT URLS

The Asset Manager is a core component built specifically for VSB to prevent server bloat.
When a user drags-and-drops an image/audio into the Global Asset Manager (Preview Panel Tab):
1.  The browser reads the `File` object.
2.  `URL.createObjectURL(file)` generates a local `blob:` URI.
3.  The asset is cached in `ctx.assets` memory using a unique `assetId` (e.g. `a_170000000_123`).
4.  When an `ASSET_` node selects this ID, the node immediately previews the `blob:` URL.

**AI IMPLICATION:** AIs cannot generate local blob URLs. When procedurally generating assets, AIs must rely on the `url` fallback field of the `ASSET_` node, pointing to external CDNs or existing public server paths. Leave `assetId` null or empty.

---

## 7. PROCEDURAL GENERATION EXAMPLES (RIGHT VS WRONG)

### Scenario A: Chaining CSS Rules (The Cascade)
**WRONG (Fanned out):**
```javascript
// This will crash compilation order and log warnings.
addEdge("css_root", "c_body", "css_root");
addEdge("css_root", "c_button", "css_root");
```
**RIGHT (Chained):**
```javascript
// This guarantees deterministic sequential order.
addEdge("css_root", "c_body", "css_root");
addEdge("c_body", "c_button", "css_root");
```

### Scenario B: Inline Styles on Elements
**RIGHT:**
```javascript
// The CSS_RULE is connected directly from the element. It does not connect to the CSS root.
// The rootId belongs to the HTML file that owns the Element.
addNode("e_header", "ELEMENT", "Header");
addNode("c_inline", "CSS_RULE", "Header Style", { code: "padding: 20px;" });
addEdge("e_header", "c_inline", "html_root"); 
```

### Scenario C: DOM Structure & JS Events
**RIGHT:**
```javascript
// 1. Files
addNode("html_main", "HTML", "index");
addNode("js_main", "JS", "app");
addEdge("html_main", "js_main", "html_main"); // Include script

// 2. Event Logic
addNode("j_click", "JS_EVENT", "Click Handler", { event: "click", code: "alert('Hi');" });
addEdge("js_main", "j_click", "js_main"); // Note: rootId is js_main

// 3. DOM & Binding
addNode("e_btn", "ELEMENT", "Button", { tag: "button", text: "Click Me" });
addEdge("html_main", "e_btn", "html_main"); // Note: rootId is html_main
addEdge("e_btn", "j_click", "html_main"); // BINDING: rootId belongs to the HTML file initiating the bind!
```

---

**END OF MANUAL.** 
Do not deviate from these rules. The engine is strictly deterministic based entirely on the constraints outlined above.
