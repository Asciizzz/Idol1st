# Page View Tools + Popup Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement page-view editing tools (Cursor/Add/Delete), chained popups, and persistent per-page active selection with Blender-like behavior.

**Architecture:** Keep page-view editor behavior owned by `RenderPage` while extending `EditorRuntime` and `EzVirtualSite` with focused APIs for selection persistence and node mutation helpers. Use declarative popup schema objects for chained menu rendering and searchable actions.

**Tech Stack:** Vite, vanilla ES modules, EzVirtualSite runtime, Vitest (new dev dependency for TDD on pure logic).

---

## File Structure and Responsibilities

- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `tests/editor/popupChainModel.test.js`
- Create: `tests/editor/selectionModel.test.js`
- Create: `resources/editor/PageToolModel.js`
- Modify: `resources/editor/RenderPage.js`
- Modify: `resources/editor/EditorRuntime.js`
- Modify: `resources/js/global/EzVirtualSite.js`
- Modify: `resources/editor/editor.css`

`PageToolModel.js` holds pure, testable logic:
- menu schema constants
- popup chain navigation helpers
- search filtering and leaf-action flattening
- small selection normalization helpers

`RenderPage.js` owns:
- right-side tool strip UI
- keyboard shortcuts for page-view only
- popup rendering + chain state
- pointer anchor and close-on-click-away behavior

`EditorRuntime.js` owns:
- iframe click selection binding
- selection highlight refresh
- small helper APIs used by `RenderPage`

`EzVirtualSite.js` owns:
- persisted `active_node_id` in page data
- selection-safe mutation helpers (through existing node APIs + new accessors)

### Task 1: Add Minimal Test Harness for TDD

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Write failing config test command expectation**

```bash
npm run test
```

Expected: script missing (`Missing script: "test"`).

- [ ] **Step 2: Add test tooling scripts**

Update `package.json` scripts and dev dependencies:

```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "test": "vitest run"
  },
  "devDependencies": {
    "laravel-vite-plugin": "^2.0.0",
    "vite": "^7.0.7",
    "vitest": "^3.2.4"
  }
}
```

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.js'],
    },
});
```

- [ ] **Step 3: Run test command to verify harness is wired**

Run: `npm run test`  
Expected: Vitest runs and reports 0 tests (or no matching test files) without script errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.js
git commit -m "test: add vitest harness for editor logic"
```

### Task 2: Build Popup Chain Pure Model with TDD

**Files:**
- Create: `resources/editor/PageToolModel.js`
- Create: `tests/editor/popupChainModel.test.js`

- [ ] **Step 1: Write failing tests for popup-chain model**

Create `tests/editor/popupChainModel.test.js`:

```js
import { describe, expect, test } from 'vitest';
import {
    ADD_MENU_SCHEMA,
    flattenActionItems,
    filterActionsByQuery,
    findMenuByPath,
} from '../../resources/editor/PageToolModel.js';

describe('popup chain model', () => {
    test('flattens only actionable leaf items', () => {
        const items = flattenActionItems(ADD_MENU_SCHEMA);
        expect(items.length).toBeGreaterThan(0);
        expect(items.every((item) => typeof item.actionId === 'string')).toBe(true);
    });

    test('filters actions by case-insensitive query', () => {
        const results = filterActionsByQuery(ADD_MENU_SCHEMA, 'div');
        expect(results.length).toBeGreaterThan(0);
        expect(results.some((item) => item.label.toLowerCase().includes('div'))).toBe(true);
    });

    test('resolves nested submenu by index path', () => {
        const submenu = findMenuByPath(ADD_MENU_SCHEMA, [1]);
        expect(submenu).toBeTruthy();
        expect(Array.isArray(submenu.items)).toBe(true);
    });
});
```

- [ ] **Step 2: Run tests to verify RED state**

Run: `npm run test -- tests/editor/popupChainModel.test.js`  
Expected: FAIL due missing `PageToolModel.js` exports.

- [ ] **Step 3: Implement minimal popup model**

Create `resources/editor/PageToolModel.js` with:
- `ADD_MENU_SCHEMA` using readable nested object format (`group`, `submenu`, `action`, `separator`, `search`).
- `flattenActionItems(schema)` returning leaf action metadata.
- `filterActionsByQuery(schema, query)` case-insensitive leaf filtering.
- `findMenuByPath(schema, path)` for chained menu stack rendering.

- [ ] **Step 4: Run tests to verify GREEN state**

Run: `npm run test -- tests/editor/popupChainModel.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/editor/PageToolModel.js tests/editor/popupChainModel.test.js
git commit -m "feat: add declarative popup chain model with tests"
```

### Task 3: Add Persistent Active Selection in EzVirtualSite + Runtime Helpers

**Files:**
- Modify: `resources/js/global/EzVirtualSite.js`
- Modify: `resources/editor/EditorRuntime.js`
- Create: `tests/editor/selectionModel.test.js`

- [ ] **Step 1: Write failing tests for selection helper logic**

Create `tests/editor/selectionModel.test.js` for pure helper methods (extracted from runtime model module or local helper exports):

```js
import { describe, expect, test } from 'vitest';
import { normalizeActiveNodeId } from '../../resources/editor/PageToolModel.js';

describe('selection normalization', () => {
    test('keeps null as root selection', () => {
        expect(normalizeActiveNodeId(null, {})).toBe(null);
    });

    test('falls back to root when node is missing', () => {
        expect(normalizeActiveNodeId('n99', { n1: {} })).toBe(null);
    });

    test('keeps existing node id when present', () => {
        expect(normalizeActiveNodeId('n1', { n1: {} })).toBe('n1');
    });
});
```

- [ ] **Step 2: Run tests to verify RED state**

Run: `npm run test -- tests/editor/selectionModel.test.js`  
Expected: FAIL due missing export.

- [ ] **Step 3: Implement persistent selection**

In `EzVirtualSite.js`:
- Ensure each page data has `active_node_id` defaulting to `null`.
- Add methods:
  - `getActiveNodeId(pageId = this.#active)`
  - `setActiveNodeId(nodeId, pageId = this.#active)`
- Normalize selection after `deleteNode`, `reparentNode`, `changePage`, and load paths where node maps can change.

In `EditorRuntime.js`:
- Add helper methods:
  - `getActiveNodeId()`
  - `setActiveNodeId(nodeId)`
  - `selectRoot()`
  - `selectNode(nodeId)`
  - `getSelectedParentForAdd()`
  - `deleteSelectedNode(mode)` where mode is `'single' | 'branch'`
- Extend iframe bindings with click handling:
  - click on `[data-vs-node-id]` selects node
  - click elsewhere in iframe selects root

- [ ] **Step 4: Run tests to verify GREEN state**

Run: `npm run test -- tests/editor/selectionModel.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/js/global/EzVirtualSite.js resources/editor/EditorRuntime.js tests/editor/selectionModel.test.js resources/editor/PageToolModel.js
git commit -m "feat: persist active page selection and runtime selection helpers"
```

### Task 4: Implement RenderPage Tools, Shortcuts, and Popup UI

**Files:**
- Modify: `resources/editor/RenderPage.js`
- Modify: `resources/editor/editor.css`
- Modify: `resources/editor/TabManager.js` (only if mode flag naming requires adapter)

- [ ] **Step 1: Write failing behavior checks (manual RED)**

Run: `npm run build`  
Expected current behavior gap:
- No right-side tool strip.
- `Shift+W/A/X` do nothing.
- No add/delete popups.

- [ ] **Step 2: Implement minimal UI and interactions**

In `RenderPage.js`:
- Render right-side tool strip in page view.
- Maintain tool state (`cursor`, `add`, `delete`).
- Register keydown handlers scoped to active renderer lifecycle.
- Gate shortcuts to page renderer `page` mode only.
- Add popup manager state:
  - base anchor position (single initial clamp)
  - chain path stack for submenus
  - search mode override and filtered action list
- Implement click-away close behavior.
- Route actions:
  - Add action creates node under selected parent (`root` when null)
  - Delete popup shown only when selected node exists
  - Delete actions call runtime helper with chosen mode

In `editor.css`:
- Add right strip layout styles.
- Add popup styles with fixed max dimensions and overflow.
- Add submenu and search list styles.
- Add selected node outline style (distinct from hover/drop target).

- [ ] **Step 3: Run build verification**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 4: Manual verification pass**

Validate:
- In page view, tools visible and interactive.
- `Shift+W` selects Cursor.
- `Shift+A` opens popup at pointer and submenu chain works.
- Search mode only appears via Search entry.
- Popup does not reposition while search content changes.
- `Shift+X` on root does not open delete popup.
- Selecting node then `Shift+X` shows delete popup with two modes.

- [ ] **Step 5: Commit**

```bash
git add resources/editor/RenderPage.js resources/editor/editor.css resources/editor/TabManager.js
git commit -m "feat: add page-view tools with chained add/delete popups"
```

### Task 5: Final Verification and Cleanup

**Files:**
- Modify: `docs/superpowers/specs/2026-05-13-page-view-tools-and-popup-chain-design.md` (only if behavior deviated)

- [ ] **Step 1: Run full checks**

Run:
- `npm run test`
- `npm run build`

Expected:
- Tests pass.
- Build passes.

- [ ] **Step 2: Confirm spec parity**

Cross-check implemented behavior against:
- `docs/superpowers/specs/2026-05-13-page-view-tools-and-popup-chain-design.md`

If mismatch, either:
- fix code, or
- update spec with exact accepted change.

- [ ] **Step 3: Commit final parity/docs changes if any**

```bash
git add docs/superpowers/specs/2026-05-13-page-view-tools-and-popup-chain-design.md
git commit -m "docs: align page tools spec with implementation details"
```

