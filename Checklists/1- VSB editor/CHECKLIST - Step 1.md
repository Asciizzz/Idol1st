# Step 1 — Wire-up Checklist

## 1. Ensure the users table exists
Add the default Laravel users migration at
`database/migrations/0001_01_01_000000_create_users_table.php`:

```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->timestamp('email_verified_at')->nullable();
    $table->string('password');
    $table->rememberToken();
    $table->timestamps();
});
```

## 2. Run the migrations
```bash
php artisan migrate
```
This runs both `create_users_table` (if missing) and
`2026_06_26_000001_add_role_to_users_table`.

## 3. Install Sanctum (if not already done)
```bash
php artisan install:api
```
This publishes the Sanctum config and creates the `personal_access_tokens` table.

## 4. File placement summary
| File | Destination |
|---|---|
| `2026_06_26_000001_add_role_to_users_table.php` | `database/migrations/` |
| `Requests/Auth/LoginRequest.php` | `app/Http/Requests/Auth/` |
| `Resources/UserResource.php` | `app/Http/Resources/` |
| `Controllers/AuthEditorController.php` | `app/Http/Controllers/` |

## 5. Add routes to routes/api.php
```php
use App\Http\Controllers\AuthEditorController;

// Public
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthEditorController::class, 'login']);
});

// Protected
Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
    Route::post('logout', [AuthEditorController::class, 'logout']);
    Route::get('me',      [AuthEditorController::class, 'me']);
});
```

## 6. Confirm Sanctum is in the api middleware stack
In `bootstrap/app.php` (Laravel 12), ensure the api middleware includes Sanctum:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->api(prepend: [
        \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
    ]);
})
```

## 7. Endpoints available after this step
| Method | URI | Description |
|---|---|---|
| POST | `/api/auth/login` | Returns `token` + `user` |
| POST | `/api/auth/logout` | Revokes current token |
| GET  | `/api/auth/me` | Returns authenticated user |

## 8. Example login request
```json
POST /api/auth/login
{
    "email": "user@example.com",
    "password": "password"
}
```

## 9. Example login response
```json
{
    "success": true,
    "token": "1|abc123...",
    "user": {
        "id": 1,
        "name": "Jane Doe",
        "email": "user@example.com",
        "role": "editor",
        "created_at": "2026-06-26T00:00:00.000000Z",
        "updated_at": "2026-06-26T00:00:00.000000Z"
    }
}
```

All subsequent requests (logout, me, and every step after this)
require the header:
```
Authorization: Bearer {token}
```
