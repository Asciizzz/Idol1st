# Page View Tools + Popup Chain Design

Date: 2026-05-13
Scope: Page tab `View` mode editor interactions only.

## Goals

- Add Blender-inspired right-side tool controls for page editing.
- Provide keyboard shortcuts:
  - `Shift+W`: Cursor tool
  - `Shift+A`: Add popup
  - `Shift+X`: Delete popup
- Support chained popup menus (nested submenus) with declarative menu data.
- Persist active node selection in EzVirtualSite page JSON.
- Keep behavior deterministic for popup placement and sizing.

## Non-Goals (This Pass)

- Multi-select editing.
- Graph mode editing tools.
- Style/Script tab shortcut support.
- Full node property inspector.

## UX Contract

### Mode and Shortcut Gating

- Tools and shortcuts are active only when:
  - current tab kind is `page`
  - current page renderer mode is `view` (existing `page` mode value)
- In all other contexts (`graph`, `style`, `script`), shortcuts do nothing.

### Right Tool Strip (Page View)

- Right-side vertical strip with:
  - Cursor
  - Add
  - Delete
- Cursor is the default selected tool.
- Clicking a tool button executes its behavior exactly as shortcut equivalent.

### Selection Model

- Single active selection only.
- Clicking a node in iframe selects that node.
- Clicking outside a node (page background/body) selects root.
- Root selection is represented as `null` and is not deletable.
- Add actions target currently selected node; if root is selected, add targets page root.

### Delete Behavior

- `Shift+X` or Delete tool opens popup only when active selection is not root.
- Delete popup title: `Mode`
- Options:
  - `Delete single`: remove selected node, reparent children to selected node parent.
  - `Delete branch`: remove selected node recursively.

### Add Popup Behavior

- Open via `Shift+A` or Add tool.
- Popup appears at pointer location with initial clamp to viewport bounds.
- Chained submenu popups are supported.
- Click-away closes all popups.
- A dedicated Search menu entry switches popup into search mode:
  - Shows input and filtered list of all leaf actions from menu tree.
  - Selecting result executes immediately.
  - Popup position stays fixed once opened, even if content expands/shrinks.
  - If content overflows viewport after filtering, overflow is acceptable.

## Data Model Changes

### EzVirtualSite Page JSON

Persist active selection directly on page data:

```json
{
  "pages": {
    "page_data": {
      "p0": {
        "title": "Home",
        "slug": "home",
        "node_counter": 12,
        "nodes": {},
        "include": { "css": [], "js": [] },
        "active_node_id": null
      }
    }
  }
}
```

Rules:
- `active_node_id = null` means root selected.
- If selected node disappears, normalize back to `null`.
- Switching pages restores each page's own `active_node_id`.

## Add Popup Chainer Schema

Use a nested declarative object in editor code:

```js
const ADD_MENU = {
  title: 'Add',
  items: [
    { type: 'group', label: 'General' },
    { type: 'submenu', label: 'Layout', items: [ ... ] },
    { type: 'action', label: 'Div', action: 'add.div' },
    { type: 'separator' },
    { type: 'group', label: 'Find' },
    { type: 'search', label: 'Search...' }
  ]
};
```

Supported item types:
- `group`: non-clickable group title.
- `separator`: horizontal divider.
- `submenu`: opens child popup.
- `action`: immediate execution.
- `search`: switches current popup to search UI.

Leaf `action` items include:
- stable `action` id (string)
- display `label`
- optional metadata (`tag`, `attrs`, etc.)

## Implementation Architecture

### RenderPage

Primary owner for:
- right tool strip rendering
- active tool state
- popup state + chained popup stack
- shortcut handling (gated by active tab/mode)
- node selection visuals sync in current page iframe

### EditorRuntime

Extend with helper APIs for page interaction:
- select node/root on click
- read/write active node id in current page data
- add node under selected parent
- delete selected node with chosen mode
- selection normalization when nodes mutate

Runtime remains responsible for iframe document event wiring.

## Execution Semantics

- Add action:
  - resolve selected parent (`active_node_id` or root)
  - create node via `site.addNode({ tag, parent })`
  - select newly created node
- Delete single:
  - `site.deleteNode(selectedId, true)`
  - set selection to previous parent if still valid, else root
- Delete branch:
  - `site.deleteNode(selectedId, false)`
  - set selection to previous parent if still valid, else root

## Visual/Interaction Details

- Tool strip uses existing editor theme tokens.
- Active selection highlight in iframe remains outline-based and will include:
  - hover outline
  - selected outline (stronger style)
  - existing drop-target style for DnD
- Popup max size is fixed by CSS constraints (`max-height` with overflow auto).
- Popup chain layering via deterministic z-index and stacked offsets.

## Error Handling

- If page/runtime missing, tool actions no-op safely.
- Delete popup suppressed on root selection.
- Invalid action id from menu config logs warning, no crash.
- If selected node not found, auto-heal selection to root.

## Testing Strategy

Manual verification checklist:
- Open page tab in view mode: right tools visible.
- `Shift+W` selects Cursor tool.
- `Shift+A` opens Add popup at cursor with boundary clamp.
- Submenu chain opens/closes correctly.
- Search entry switches to search view and filters leaf actions.
- Search does not reposition popup while filtering.
- Click-away closes popup chain.
- Click node selects node; click background selects root.
- Selection persists in page JSON (`active_node_id`) across page switches.
- `Shift+X` on root does nothing.
- `Shift+X` on node opens delete popup and both delete modes behave correctly.
- Graph/style/script contexts ignore shortcuts.

## Rollout

1. Add data-model support for `active_node_id` defaults and normalization in EzVirtualSite.
2. Add runtime APIs for selection + mutations around active node.
3. Add RenderPage right-strip, shortcuts, and popup chain system.
4. Add CSS for tool strip, popups, selected outlines.
5. Run build and smoke-test flows above.
