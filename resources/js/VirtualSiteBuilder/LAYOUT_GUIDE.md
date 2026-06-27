# Virtual Site Builder: Graph Layout Guide

To keep the infinite canvas from turning into unreadable "spaghetti", follow this standardized layout hierarchy. This ensures the visual structure naturally mimics the logical flow of web architecture.

## 1. Vertical HTML Spines
- Place your primary root **HTML File** nodes (`index.html`, `about.html`, etc.) in a single **vertical column**. 
- Keep them anchored at `x = 0`.
- Leave plenty of vertical space between pages (e.g., a `600px` gap) so their DOM branches don't collide vertically.

## 2. Right-Branching DOM Trees
- All **HTML Elements** (`div`, `nav`, `section`) should branch horizontally to the **right** side of their root HTML File nodes.
- Maintain strict left-to-right hierarchy (`x` coordinate strictly increases as elements nest deeper).
- Example: 
  - `Root HTML` at `x = 0`
  - `Shared Nav` at `x = 300`
  - `Nav Logo` at `x = 600`
  - `Logo Text` at `x = 900`

## 3. Left-Branching CSS Vines
- Place your primary **CSS File** nodes (e.g., `main.css`) on the **left** side of the root HTML column (e.g., `x = -400`).
- From the CSS file, branch your **CSS Rule** nodes horizontally to the left.
- *Note:* It is not an enforceable rule to go infinitely to the far left. You are encouraged to arrange CSS rules in a **batch zigzag** pattern, stacking them tighter and closer vertically to conserve space. Because CSS rules can be collapsed into compact headers, this zigzag layout keeps them significantly cleaner than an infinite horizontal line while remaining distinct from the HTML tree.

## 4. Floating JS Event Modules
- Keep your global **JS File** nodes (e.g., `app.js`) grouped near the CSS files on the left side (e.g., `x = -400`).
- However, place the actual **JS Event** script nodes (the logic blocks that bind to elements) **high up** on the canvas, floating above the dense HTML element logic (on the right side).
- Example: Place `JS_EVENT` nodes at `y = -400` or higher, and align them horizontally across the top (e.g., `x = 400, 800, 1200`). This creates a "global cloud" of scripts that you can visually pull down and attach to specific DOM elements.

## Summary
- **Left Side:** Stylesheets, JS Files, and horizontal CSS Rules.
- **Center Column:** HTML Pages.
- **Right Side:** Horizontal HTML DOM element hierarchy.
- **Top Canopy:** Floating JS Event logic modules.
