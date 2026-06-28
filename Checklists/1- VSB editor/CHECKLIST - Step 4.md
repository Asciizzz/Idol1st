# Step 4 — Wire-up Checklist

## 1. No new migration
Step 4 reuses `project_snapshots` from Step 3 — no new table needed.

## 2. File placement summary
| File | Destination |
|---|---|
| `Requests/Compiler/CompileRequest.php` | `app/Http/Requests/Compiler/` |
| `Controllers/CompilerController.php` | `app/Http/Controllers/` |

`SnapshotResource` from Step 3 is reused as the response shape — no new resource needed.

## 3. Add route to routes/api.php
```php
use App\Http\Controllers\CompilerController;
 
Route::middleware('auth:sanctum')->group(function () {
 
    Route::post('projects/{project}/compile', [CompilerController::class, 'compile']);
 
});
```

## 4. Endpoints available after this step
| Method | URI | Description |
|---|---|---|
| POST | `/api/projects/{project}/compile` | Compile + save a new snapshot |

All routes require `Authorization: Bearer {token}` from Step 1.

## 5. Example POST body
```json
{
    "graph_data": { "nodes": [], "edges": [], "camera": {}, "grid": {} },
    "compiled_html": "<html>...</html>",
    "compiled_css": "body { margin: 0; }",
    "compiled_js": "console.log('vsb');"
}
```
All four fields are **required** on compile (unlike raw snapshot saves where compiled output is optional).

## 6. Response shape
```json
{
    "success": true,
    "data": {
        "id": 1,
        "project_id": 1,
        "version": 3,
        "graph_data": { "nodes": [], "edges": [] },
        "compiled_html": "...",
        "compiled_css": "...",
        "compiled_js": "...",
        "created_at": "2026-06-26T00:00:00.000000Z"
    }
}
```

## 7. Note on sanitization
`CompilerController::sanitizeHtml()` currently strips any `<script>` tags that
don't have `id="vsb-js"` (the tag the VSB compiler injects for JS output).
If you later need stricter sanitization (e.g. for multi-tenant or user-generated
content), swap in `HTMLPurifier` via:
```bash
composer require ezyang/htmlpurifier
```

app/Http/Requests/Compiler/CompileRequest.php app/Http/Controllers/CompilerController.php
