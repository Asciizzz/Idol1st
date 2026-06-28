# Step 5 — Wire-up Checklist

## 1. Run the migration
```bash
php artisan migrate
```

## 2. File placement summary
| File | Destination |
|---|---|
| `migrations/2026_06_26_000004_create_assets_table.php` | `database/migrations/` |
| `Models/Asset.php` | `app/Models/` |
| `Policies/AssetPolicy.php` | `app/Policies/` |
| `Requests/Asset/StoreAssetRequest.php` | `app/Http/Requests/Asset/` |
| `Resources/AssetResource.php` | `app/Http/Resources/` |
| `Controllers/AssetController.php` | `app/Http/Controllers/` |

## 3. Register the AssetPolicy
In `app/Providers/AppServiceProvider.php`, add to `boot()`:
```php
use App\Models\Asset;
use App\Policies\AssetPolicy;

Gate::policy(Asset::class, AssetPolicy::class);
```

## 4. Add routes to routes/api.php
```php
use App\Http\Controllers\AssetController;
 
Route::middleware('auth:sanctum')->group(function () {
 
    Route::prefix('projects/{project}')->group(function () {
        Route::get('assets',              [AssetController::class, 'index']);
        Route::post('assets',             [AssetController::class, 'store']);
        Route::delete('assets/{asset}',   [AssetController::class, 'destroy']);
    });
 
});
```

## 5. Add the assets relationship to Project model
Make sure `app/Models/Project.php` has this (already included in the Step 2 file):
```php
public function assets(): HasMany
{
    return $this->hasMany(Asset::class);
}
```

## 6. Configure the storage disk
For local development, run:
```bash
php artisan storage:link
```
This creates the `public/storage` symlink so uploaded files are publicly accessible.

For production (S3), set these in `.env`:
```env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=...
AWS_BUCKET=...
```

## 7. Increase PHP upload limits (if needed)
For large font or audio files, check `php.ini`:
```ini
upload_max_filesize = 20M
post_max_size = 25M
```

## 8. Endpoints available after this step
| Method | URI | Description |
|---|---|---|
| GET | `/api/projects/{project}/assets` | List project assets |
| POST | `/api/projects/{project}/assets` | Upload a new asset |
| DELETE | `/api/projects/{project}/assets/{asset}` | Delete an asset |

All routes require `Authorization: Bearer {token}` from Step 1.

## 9. Example upload (multipart/form-data)
```
POST /api/projects/1/assets
Content-Type: multipart/form-data

file: [binary file]
```

## 10. Supported file types
| Type | MIME types |
|---|---|
| Image | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml` |
| Audio | `audio/mpeg`, `audio/ogg`, `audio/wav`, `audio/webm`, `audio/aac` |
| Font  | `font/ttf`, `font/woff`, `font/woff2` |
