# Step 6 — Wire-up Checklist

## 1. Run the migration
```bash
php artisan migrate
```

## 2. File placement summary
| File | Destination |
|---|---|
| `migrations/2026_06_26_000005_create_published_sites_table.php` | `database/migrations/` |
| `Models/PublishedSite.php` | `app/Models/` |
| `Requests/Publish/PublishRequest.php` | `app/Http/Requests/Publish/` |
| `Resources/PublishedSiteResource.php` | `app/Http/Resources/` |
| `Controllers/PublishController.php` | `app/Http/Controllers/` |

## 3. Add routes to routes/api.php
```php
use App\Http\Controllers\PublishController;
 
Route::middleware('auth:sanctum')->group(function () {
 
    Route::prefix('projects/{project}')->group(function () {
        Route::post('publish',    [PublishController::class, 'publish']);
        Route::get('published',   [PublishController::class, 'show']);
    });
 
});
```

## 4. Add the publishedSite relationship to Project model
Add to `app/Models/Project.php`:
```php
public function publishedSites(): HasMany
{
    return $this->hasMany(PublishedSite::class);
}
```

## 5. Endpoints available after this step
| Method | URI | Description |
|---|---|---|
| POST | `/api/projects/{project}/publish` | Publish a snapshot |
| GET  | `/api/projects/{project}/published` | Get current live site info |

All routes require `Authorization: Bearer {token}` from Step 1.

## 6. Example POST body
```json
// Publish latest snapshot
POST /api/projects/1/publish
{}

// Publish a specific version with a custom domain
POST /api/projects/1/publish
{
    "version": 3,
    "domain": "myidol.com"
}
```

## 7. Example response
```json
{
    "success": true,
    "data": {
        "id": 1,
        "project_id": 1,
        "snapshot_id": 5,
        "snapshot_version": 3,
        "domain": "myidol.com",
        "published_at": "2026-06-26T00:00:00.000000Z"
    }
}
```

## 8. Important — compile before publish
Publishing will fail with a 422 if the target snapshot has no `compiled_html`.
Always run `POST /api/projects/{id}/compile` (Step 4) before publishing.

## 9. Publish history
Every publish creates a new record — the full history is preserved.
The "live" site is always the most recent `published_at` for the project.
