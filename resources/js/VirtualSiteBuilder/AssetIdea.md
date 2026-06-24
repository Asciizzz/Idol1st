# VSB Asset Implementation Plan: Node-Based Asset Linking

To support rich media assets (`AssetImage`, `AssetAudio`) within our graph-based Virtual Site Builder, we will use a **Provider/Consumer Node Architecture**. Assets will exist as standalone data nodes that can be wired into HTML Element nodes via a dedicated "Asset Src" connection socket.

## 1. Node Architecture Revamp

### The Provider: Asset Nodes (`AssetImage`, `AssetAudio`)
Instead of acting as DOM elements directly, Asset Nodes serve as data providers.
* **Functionality:** They handle the file upload via the Laravel backend.
* **Visual Styling:** 
  * They will feature a **full white header background** with a **black icon** (an image icon or a speaker icon) and the **name of the uploaded file**.
  * Below the header, the node will display the **URL** of the asset.
  * Below the URL, the node will display a **media preview** (the actual image, or an HTML5 audio player).
* **Output Socket:** They expose a single output socket (the `src` URL string).
* **Reusability:** A single Asset Node can have its output socket connected to *multiple* different Element Nodes across the graph.

### The Consumer: `htmlElement` Node Rework
Existing `htmlElement` nodes will be updated to accept asset data.
* **New Input Socket ("Asset Src"):** 
  * Only accepts a maximum of **1 incoming connection**.
  * Visually distinct: It will have an image/audio icon, and connections made to it will render as **white, dotted connecting lines** to signify it is an "Asset Connection" rather than a structural DOM connection.

## 2. Compilation Logic (`VsbCompiler`)
The compiler will handle the structural integrity of this logic:
* When compiling an `htmlElement`, the compiler checks if the node has an active connection on its "Asset Src" socket.
* **Type Checking:** 
  * IF the `htmlElement` is of type `<img>`, `<audio>`, or `<video>`: It grabs the `src` URL from the connected Asset Node and injects it into the HTML tag (e.g., `<img src="${assetUrl}">`).
  * IF the `htmlElement` is a `<div>`, `<span>`, or any other non-media tag: The compiler **ignores** the asset connection entirely, doing nothing.

## 3. Backend Storage (Laravel)
We must implement a storage endpoint for the VSB to upload raw files.
* **Endpoint:** `POST /api/assets/upload`
* **Controller Logic:** 
  1. Validate the file.
  2. Use Laravel's Storage facade: `$path = $request->file('asset')->store('tenants/' . $tenantId . '/assets', 'public');`
  3. Return JSON: `{ "success": true, "url": "/storage/" . $path }`

## 4. Execution Steps
1. **Laravel Backend:** Create the `AssetController` and API route to handle uploads.
2. **VSB UI (Sockets & Links):** Update the graph rendering logic to support "Asset Src" input sockets on `htmlElement`, enforcing the 1-child limit and styling the connection lines (white/dotted).
3. **VSB Asset Nodes:** Create `AssetImage.js` and `AssetAudio.js` with the file picker, upload logic, and an output socket.
4. **VSB Compiler:** Update `compiler.js` to read the "Asset Src" socket during HTML compilation and conditionally apply the `src` attribute based on the element type.
