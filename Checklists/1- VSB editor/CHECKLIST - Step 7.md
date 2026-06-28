# Step 7 — Wire-up Checklist

## 1. No new migration
Step 7 reads from existing tables — no new migration needed.

## 2. File placement summary
| File | Destination |
|---|---|
| `Middleware/EnsureAdmin.php` | `app/Http/Middleware/EnsureAdmin.php` |
| `Controllers/AdminController.php` | `app/Http/Controllers/AdminController.php` |

`UserResource` and `ProjectResource` from Steps 1 and 2 are reused — no new resources needed.

## 3. Register the middleware alias
In `bootstrap/app.php`, add `ensure.admin` alongside the existing `require.auth` alias:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'require.auth' => \App\Http\Middleware\RequireAuth::class,
        'ensure.admin' => \App\Http\Middleware\EnsureAdmin::class,
    ]);
})
```

## 4. Add routes to routes/api.php
```php
use App\Http\Controllers\AdminController;
 
Route::middleware(['auth:sanctum', 'ensure.admin'])->prefix('admin')->group(function () {
    Route::get('users',    [AdminController::class, 'users']);
    Route::get('projects', [AdminController::class, 'projects']);
    Route::get('stats',    [AdminController::class, 'stats']);
});
```

## 5. Endpoints available after this step
| Method | URI | Middleware | Description |
|---|---|---|---|
| GET | `/api/admin/users` | `auth:sanctum` + `ensure.admin` | List all users |
| GET | `/api/admin/projects` | `auth:sanctum` + `ensure.admin` | List all projects |
| GET | `/api/admin/stats` | `auth:sanctum` + `ensure.admin` | Platform stats |

All routes require `Authorization: Bearer {token}` from an admin user.

## 6. Query parameters

### GET /api/admin/users
| Param | Type | Description |
|---|---|---|
| `search` | string | Filter by name or email |
| `role` | string | Filter by `admin`, `editor`, or `viewer` |
| `per_page` | integer | Results per page (default 20) |

### GET /api/admin/projects
| Param | Type | Description |
|---|---|---|
| `search` | string | Filter by name or slug |
| `status` | string | Filter by `draft` or `published` |
| `per_page` | integer | Results per page (default 20) |

## 7. Example stats response
```json
{
    "success": true,
    "data": {
        "users": {
            "total": 42,
            "new_30_days": 7,
            "by_role": { "admin": 1, "editor": 38, "viewer": 3 }
        },
        "projects": {
            "total": 95,
            "new_30_days": 12,
            "published": 61,
            "draft": 34
        },
        "snapshots": { "total": 430 },
        "assets": {
            "total": 280,
            "total_size": 524288000,
            "total_size_mb": 500.0
        },
        "last_published": {
            "project": "Sakura Fan Site",
            "slug": "sakura-fan-site",
            "published_at": "2026-06-26T12:00:00.000000Z"
        }
    }
}
```

## 8. Test with an admin token
```bash
# Create an admin user via tinker if you haven't already
php artisan tinker
>>> \App\Models\User::factory()->create([
...     'email' => 'admin@example.com',
...     'password' => bcrypt('password'),
...     'role' => 'admin',
... ]);
```
Then log in via `POST /api/auth/login` with those credentials and use the returned
token to hit the `/api/admin/*` endpoints.
