# Idol1st — Backend Plan

## What the Project Is

A **SaaS visual website builder** — users log in, use a node-graph editor (`VirtualSiteBuilder`) to design pages, and the system compiles/saves their work. There's also an Admin Panel for managing users and sites.

---

## Architecture Overview

```
Laravel 12 (already bootstrapped)
├── Auth layer (sessions/tokens)
├── Editor API (CRUD for VSB project state)
├── Site compilation/rendering API
├── Admin API (user/site management)
└── Asset management (uploads, fonts)
```

---

## Domain Models & Migrations

### 1. `User`
Already exists (Laravel default).

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | PK |
| `name` | string | |
| `email` | string | unique |
| `password` | string | hashed |
| `role` | enum | `admin` / `editor` / `viewer` |

---

### 2. `Project`
A user's site-building workspace.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | PK |
| `user_id` | bigint | FK → users |
| `name` | string | |
| `slug` | string | unique |
| `status` | enum | `draft` / `published` |
| `settings` | json | global project config |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

### 3. `ProjectSnapshot`
Versioned saves of the VSB graph state.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | PK |
| `project_id` | bigint | FK → projects |
| `graph_data` | longText/json | full node/edge state from VSB |
| `compiled_html` | longText | client-compiled output |
| `compiled_css` | longText | |
| `compiled_js` | longText | |
| `version` | integer | auto-incrementing per project |
| `created_at` | timestamp | |

---

### 4. `Asset`
Uploaded images, fonts, and audio files.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | PK |
| `user_id` | bigint | FK → users |
| `project_id` | bigint | FK → projects, nullable |
| `type` | enum | `image` / `audio` / `font` |
| `filename` | string | original filename |
| `path` | string | storage path |
| `mime_type` | string | |
| `size` | integer | bytes |
| `created_at` | timestamp | |

---

### 5. `PublishedSite`
The live output of a published project.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | PK |
| `project_id` | bigint | FK → projects |
| `domain` | string | nullable, custom domain |
| `html_snapshot` | longText | final rendered HTML |
| `published_at` | timestamp | |

---

## API Routes

Matching patterns from `idol_saas_api.yaml`:

```
# Auth
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

# Projects
GET    /api/projects
POST   /api/projects
GET    /api/projects/{id}
PUT    /api/projects/{id}
DELETE /api/projects/{id}

# Snapshots (versioned graph saves)
GET    /api/projects/{id}/snapshots
POST   /api/projects/{id}/snapshots
GET    /api/projects/{id}/snapshots/{version}

# Compiler & Publishing
POST   /api/projects/{id}/compile
POST   /api/projects/{id}/publish

# Assets
GET    /api/projects/{id}/assets
POST   /api/projects/{id}/assets
DELETE /api/projects/{id}/assets/{assetId}

# Admin (role-gated)
GET    /api/admin/users
GET    /api/admin/projects
GET    /api/admin/stats
```

---

## Controllers to Build

| Controller | Responsibility |
|---|---|
| `AuthEditorController` | Login, logout, me endpoint — already exists, needs implementation |
| `ProjectController` | CRUD for projects |
| `SnapshotController` | Save and retrieve VSB graph state |
| `CompilerController` | Accept compiled output from frontend, store it |
| `AssetController` | File upload and management |
| `PublishController` | Promote a snapshot to the live site |
| `AdminController` | User management and global stats for admin panel |

---

## Key Implementation Notes

### 1. The Compiler Endpoint (`POST /api/projects/{id}/compile`)

This is the most complex piece. The frontend's `VirtualSiteBuilder/compiler.js` runs client-side. The backend should:

- Receive the serialized graph JSON alongside compiled `html`, `css`, and `js` strings
- Store both the raw graph and the compiled output as a new `ProjectSnapshot`
- Optionally re-validate or sanitize the compiled output server-side

The node types the VSB produces (`htmlElement`, `cssRule`, `jsFile`, `htmlFile`, `cssFile`, `jsEvent`, `elementNode`, etc.) are all defined in `resources/js/VirtualSiteBuilder/nodedata/` — the graph JSON will reflect these shapes.

---

### 2. Authentication

`AuthEditorController` already exists in the project. Use **Laravel Sanctum** (already a dependency) for SPA token-based auth. The login flow should:

1. Validate credentials
2. Issue a Sanctum token
3. Return user + token to the frontend editor

---

### 3. Graph State Format

The VSB uses `VsGraph` with nodes and edges stored as JSON. Key considerations:

- `ProjectSnapshot.graph_data` must be `longText` or `json` — graphs can be large
- The graph includes camera state (`VsCamera`), dot grid config (`VsDotGrid`), and all node/edge data (`VsData`)
- On snapshot load, return the full graph blob as-is; the frontend handles re-hydration

---

### 4. Asset Storage

- Fonts (`.ttf`) are already in `/public/assets/Fonts/`
- Use Laravel's filesystem with the `public` disk locally, or S3 for production
- Validate MIME types on upload: `image/*`, `audio/*`, `font/ttf`, `font/woff`, `font/woff2`

---

### 5. Existing Migration

`2026_06_25_193344_create_sessions_table.php` is already present. New migrations to add:

1. `add_role_to_users_table`
2. `create_projects_table`
3. `create_project_snapshots_table`
4. `create_assets_table`
5. `create_published_sites_table`

---

## Implementation Order

| Step | Task |
|---|---|
| 1 | Implement `AuthEditorController` with Sanctum login/logout/me |
| 2 | Build `ProjectController` with user-scoped policy |
| 3 | Build `SnapshotController` — save/load graph state; auto-snapshot on compile |
| 4 | Build `CompilerController` — accept compiled HTML/CSS/JS + graph JSON |
| 5 | Build `AssetController` — file upload with MIME validation |
| 6 | Build `PublishController` — promote snapshot to `PublishedSite` |
| 7 | Build `AdminController` — role-gated user management and stats |

---

## Notes on the API YAML

The `idol_saas_api.yaml` file in the root of the project specifies exact request/response shapes. Once reviewed, it should drive:

- Request validation classes (`app/Http/Requests/`)
- API Resource transformers (`app/Http/Resources/`)
- Any additional routes not listed above

The plan above reflects what can be inferred from the frontend code and existing controller structure. The YAML should be treated as the source of truth for field names, response envelopes, and error formats.
