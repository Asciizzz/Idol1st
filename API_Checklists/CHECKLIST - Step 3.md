# Step 3 — Wire-up Checklist

## 1. Run the migration
```bash
php artisan migrate
```

## 2. File placement summary
| File | Destination |
|---|---|
| `2026_06_26_000003_create_project_snapshots_table.php` | `database/migrations/` |
| `Models/ProjectSnapshot.php` | `app/Models/` |
| `Requests/Snapshot/StoreSnapshotRequest.php` | `app/Http/Requests/Snapshot/` |
| `Resources/SnapshotResource.php` | `app/Http/Resources/` |
| `Controllers/SnapshotController.php` | `app/Http/Controllers/` |

## 3. Add routes to routes/api.php
Paste the contents of `api_snapshots.php` into the existing `auth:sanctum` group in `routes/api.php` — alongside the project routes from Step 2.

## 4. Add the snapshots relationship to Project model
Make sure `app/Models/Project.php` has this (already included in the Step 2 file):
```php
public function snapshots(): HasMany
{
    return $this->hasMany(ProjectSnapshot::class);
}
```

## 5. Endpoints available after this step
| Method | URI | Description |
|---|---|---|
| GET | `/api/projects/{project}/snapshots` | List all versions (no graph blob) |
| POST | `/api/projects/{project}/snapshots` | Save a new snapshot |
| GET | `/api/projects/{project}/snapshots/{version}` | Load a specific version |

All routes require `Authorization: Bearer {token}` from Step 1.

## 6. Example POST body
```json
{
    "graph_data": { "nodes": [], "edges": [], "camera": {}, "grid": {} },
    "compiled_html": "<html>...</html>",
    "compiled_css": "body { ... }",
    "compiled_js": "console.log(...)"
}
```
`compiled_html`, `compiled_css`, and `compiled_js` are optional for plain graph saves.
