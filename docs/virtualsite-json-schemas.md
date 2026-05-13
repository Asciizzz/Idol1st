# VirtualSite Data Schemas (Strict)

This is a companion to `docs/virtualsite-editor-codex-guide.md`.
It defines strict schemas for:

- `project_json` (saved by `/editor/save`)
- `editor.explorer.layout` (stored in `custom` via `setCustomData`)

## 1. `project_json` JSON Schema (Draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://idol1st.local/schema/project-json.schema.json",
  "title": "VirtualSite Project JSON",
  "type": "object",
  "additionalProperties": false,
  "required": ["project", "pages", "stylesheets", "scripts"],
  "properties": {
    "project": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "name": { "type": "string" },
        "domain": { "type": "string" },
        "description": { "type": "string" }
      }
    },
    "pages": {
      "type": "object",
      "additionalProperties": false,
      "required": ["page_start", "page_counter", "page_data"],
      "properties": {
        "page_start": { "type": ["string", "null"], "pattern": "^p[0-9]+$" },
        "page_counter": { "type": "integer", "minimum": 0 },
        "page_data": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/page"
          },
          "propertyNames": {
            "pattern": "^p[0-9]+$"
          }
        }
      }
    },
    "stylesheets": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/$defs/stylesheet"
      },
      "propertyNames": {
        "pattern": "^[^\\s]+$"
      }
    },
    "scripts": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/$defs/script"
      },
      "propertyNames": {
        "pattern": "^[^\\s]+$"
      }
    },
    "custom": {
      "type": "object",
      "additionalProperties": true
    }
  },
  "$defs": {
    "page": {
      "type": "object",
      "additionalProperties": false,
      "required": ["title", "slug", "node_counter", "nodes", "include", "active_node_id"],
      "properties": {
        "title": { "type": "string" },
        "slug": { "type": "string" },
        "node_counter": { "type": "integer", "minimum": 0 },
        "active_node_id": {
          "type": ["string", "null"],
          "pattern": "^n[0-9]+$"
        },
        "nodes": {
          "type": "object",
          "propertyNames": { "pattern": "^n[0-9]+$" },
          "additionalProperties": {
            "$ref": "#/$defs/node"
          }
        },
        "include": {
          "type": "object",
          "additionalProperties": false,
          "required": ["css", "js"],
          "properties": {
            "css": {
              "type": "array",
              "items": { "type": "string", "minLength": 1 },
              "uniqueItems": true
            },
            "js": {
              "type": "array",
              "items": { "type": "string", "minLength": 1 },
              "uniqueItems": true
            }
          }
        }
      }
    },
    "node": {
      "type": "object",
      "additionalProperties": false,
      "required": ["tag", "parent"],
      "properties": {
        "tag": { "type": "string", "minLength": 1 },
        "parent": {
          "type": ["string", "null"],
          "pattern": "^n[0-9]+$"
        },
        "children": {
          "type": "array",
          "items": { "type": "string", "pattern": "^n[0-9]+$" },
          "uniqueItems": true
        },
        "attrs": {
          "type": "object",
          "additionalProperties": {
            "type": ["string", "number", "boolean", "null"]
          }
        },
        "text": { "type": "string" },
        "graph": {
          "type": ["object", "array", "string", "number", "boolean", "null"]
        }
      }
    },
    "stylesheet": {
      "oneOf": [
        { "type": "string" },
        {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "additionalProperties": {
              "type": ["string", "number"]
            }
          }
        }
      ]
    },
    "script": {
      "type": "object",
      "additionalProperties": false,
      "required": ["variables", "actions", "events"],
      "properties": {
        "variables": {
          "type": "object",
          "additionalProperties": true
        },
        "actions": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        },
        "events": {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": ["selector", "action"],
              "properties": {
                "selector": { "type": "string", "minLength": 1 },
                "action": { "type": "string", "minLength": 1 }
              }
            }
          }
        }
      }
    }
  }
}
```

## 2. `editor.explorer.layout` JSON Schema

This object is stored at `custom.editor.explorer.layout`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://idol1st.local/schema/editor-explorer-layout.schema.json",
  "title": "Editor Explorer Layout",
  "type": "object",
  "additionalProperties": false,
  "required": ["folders", "placements", "collapsed", "nextFolderCounter"],
  "properties": {
    "folders": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/$defs/folder"
      }
    },
    "placements": {
      "type": "object",
      "additionalProperties": {
        "type": "string",
        "minLength": 1
      },
      "propertyNames": {
        "pattern": "^(page|style|script):"
      }
    },
    "collapsed": {
      "type": "object",
      "additionalProperties": { "type": "boolean" }
    },
    "nextFolderCounter": {
      "type": "integer",
      "minimum": 1
    }
  },
  "$defs": {
    "folder": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "name", "parentId", "locked"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "name": { "type": "string", "minLength": 1 },
        "parentId": { "type": "string" },
        "locked": { "type": "boolean" }
      }
    }
  }
}
```

## 3. Runtime constraints not expressible well in JSON Schema

- `pages.page_start` should be either `null` or a key present in `pages.page_data`.
- `page.active_node_id` should be either `null` or a key present in that page's `nodes`.
- Each `node.parent` should be `null` or a key present in the same page's `nodes`.
- Node parent-child relationships should be consistent in both directions.
- Node graph should be acyclic (no reparent cycles).
- Explorer `folders` must contain locked core folders:
  - `root` (parentId `""`)
  - `pages` (parentId `"root"`)
  - `styles` (parentId `"root"`)
  - `scripts` (parentId `"root"`)
- Each `placements[*]` value should reference an existing folder id.

## 4. Compatibility notes (important)

- `AuthEditorController` only validates top-level `project_json` keys as arrays/objects; deeper strictness is not enforced server-side yet.
- `EzVirtualSite` normalizes/repairs some fields at runtime (`include`, `active_node_id`, styles/scripts name normalization).
- If you enforce these schemas server-side, do it in warn mode first to avoid rejecting older saved drafts.

## 5. Recommended next step

- Add a shared validator utility and run it:
  - before save in `SaveService`
  - optionally in `/editor/save` for server-side guardrails.
