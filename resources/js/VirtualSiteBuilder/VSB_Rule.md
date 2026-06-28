# Virtual Site Builder (VSB) - Rules and Documentation

This document outlines the core components (nodes) within the Virtual Site Builder and defines the rules governing how they can interact (edges).

## Components (Nodes)

The VSB uses various node types to represent different parts of a web project:

1. **HTML File (`HTML`)**: Represents a `.html` page. Acts as the root container for elements and can include CSS/JS files.
2. **CSS File (`CSS`)**: Represents a `.css` stylesheet. Acts as the root container for global CSS rules.
3. **JS File (`JS`)**: Represents a `.js` script. Owns and executes the logic for bound JavaScript events.
4. **HTML Element (`ELEMENT`)**: Represents a standard DOM element (e.g., `div`, `img`, `button`). Contains a tag name, attributes, and inner text.
5. **CSS Rule (`CSS_RULE`)**: Represents a CSS selector and its styling code.
6. **JS Event (`JS_EVENT`)**: Represents an event listener (e.g., `click`, `hover`) and its execution logic.
7. **Asset Image (`ASSET_IMAGE`)**: Represents a local or external image file to be used as a source.
8. **Asset Audio (`ASSET_AUDIO`)**: Represents a local or external audio file to be used as a source.

---

## Valid Connections (Edges)

Edges define the relationships between nodes. The graph strictly enforces the following `Source -> Destination` connections:

### File Includes & Root Placements
* **`HTML` -> `CSS`**: Links the CSS stylesheet to the HTML page (`<link rel="stylesheet">`).
* **`HTML` -> `JS`**: Links the JS script to the HTML page (`<script src="..." defer>`).
* **`HTML` -> `ELEMENT`**: Places the element as a root element inside the HTML document's `<body>`.
* **`CSS` -> `CSS_RULE`**: Places the CSS rule at the root level of the CSS stylesheet.
* **`JS` -> `JS_EVENT`**: Specifies that the JS file is responsible for executing the event logic. 

### DOM Hierarchy & Element Behaviors
* **`ELEMENT` -> `ELEMENT`**: Establishes a Parent-Child DOM relationship. The destination becomes a child of the source element.
* **`ELEMENT` -> `CSS_RULE`**: Applies the CSS rule strictly as an **Inline Style** to the element. (Note: These rules do not belong to a CSS file).
* **`ELEMENT` -> `JS_EVENT`**: Binds the event listener to the element. The event will only trigger on this specific element.
* **`ELEMENT` -> `ASSET_IMAGE`**: Automatically sets the image asset as the `src` attribute of the element (e.g., for `<img>` tags).
* **`ELEMENT` -> `ASSET_AUDIO`**: Automatically sets the audio asset as the `src` attribute of the element (e.g., for `<audio>` tags).

### Rule Nesting
* **`CSS_RULE` -> `CSS_RULE`**: Nests the destination CSS rule inside the source CSS rule (useful for nested selectors/organization).

---

## Strict Constraints & Invalid Connections

To maintain structural integrity, the compiler and UI strictly enforce the following structural rules. Any violation will instantly flag the edge as invalid (indicated by a solid red line and a warning triangle).

1. **No Multiple Parents for Elements**: An `ELEMENT` node can only have **one** structural parent (either an `HTML` node or another `ELEMENT` node).
2. **No Bidirectional Edges**: If Node A connects to Node B, Node B cannot connect back to Node A.
3. **No Duplicate Edges**: You cannot have multiple identical edges spanning between the exact same Source and Destination pair.
4. **No JS Event Chaining**: A `JS_EVENT` cannot connect to another `JS_EVENT`.
5. **No Invalid Routes**: Any `Source -> Destination` type combination not explicitly listed in the Valid Connections section above will trigger an immediate structural error.
