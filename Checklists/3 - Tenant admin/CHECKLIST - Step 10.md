# Step 10 — Wire-up Checklist

## 1. Run the migrations
```bash
php artisan migrate
```
Four new migrations will run:
- `2026_06_26_000012_create_tenant_admins_table`
- `2026_06_26_000013_create_idol_profiles_table`
- `2026_06_26_000014_create_idol_groups_table`
- `2026_06_26_000015_create_social_links_table`

## 2. File placement summary
| File | Destination |
|---|---|
| `migrations/2026_06_26_000012_create_tenant_admins_table.php` | `database/migrations/` |
| `migrations/2026_06_26_000013_create_idol_profiles_table.php` | `database/migrations/` |
| `migrations/2026_06_26_000014_create_idol_groups_table.php` | `database/migrations/` |
| `migrations/2026_06_26_000015_create_social_links_table.php` | `database/migrations/` |
| `Models/TenantAdmin.php` | `app/Models/` |
| `Models/IdolProfile.php` | `app/Models/` |
| `Models/IdolGroup.php` | `app/Models/` |
| `Models/SocialLink.php` | `app/Models/` |
| `Middleware/EnsureTenantAdmin.php` | `app/Http/Middleware/` |
| `Resources/TenantAdminResource.php` | `app/Http/Resources/` |
| `Resources/IdolProfileResource.php` | `app/Http/Resources/` |
| `Resources/IdolGroupResource.php` | `app/Http/Resources/` |
| `Resources/SocialLinkResource.php` | `app/Http/Resources/` |
| `Requests/Manage/TenantAdminLoginRequest.php` | `app/Http/Requests/Manage/` |
| `Requests/Manage/UpdateIdolProfileRequest.php` | `app/Http/Requests/Manage/` |
| `Requests/Manage/StoreSocialLinkRequest.php` | `app/Http/Requests/Manage/` |
| `Requests/Manage/StoreIdolGroupRequest.php` | `app/Http/Requests/Manage/` |
| `Controllers/Manage/TenantAdminAuthController.php` | `app/Http/Controllers/Manage/` |
| `Controllers/Manage/IdolProfileController.php` | `app/Http/Controllers/Manage/` |
| `Controllers/Manage/SocialLinkController.php` | `app/Http/Controllers/Manage/` |
| `Controllers/Manage/IdolGroupController.php` | `app/Http/Controllers/Manage/` |

Note: create the `Manage/` subdirectory inside `Controllers/` and `Requests/` if it doesn't exist.

## 3. Register the EnsureTenantAdmin middleware alias
In `bootstrap/app.php`:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'require.auth'         => \App\Http\Middleware\RequireAuth::class,
        'ensure.admin'         => \App\Http\Middleware\EnsureAdmin::class,
        'resolve.tenant'       => \App\Http\Middleware\ResolveTenant::class,
        'ensure.service.admin' => \App\Http\Middleware\EnsureServiceAdmin::class,
        'ensure.tenant.admin'  => \App\Http\Middleware\EnsureTenantAdmin::class, // add this
    ]);
})
```

## 4. Register TenantAdmin as a Sanctum authenticatable model
In `config/auth.php`, add to providers and guards:
```php
'guards' => [
    // ... existing guards
    'tenant_admin' => ['driver' => 'sanctum', 'provider' => 'tenant_admins'],
],
'providers' => [
    // ... existing providers
    'tenant_admins' => ['driver' => 'eloquent', 'model' => App\Models\TenantAdmin::class],
],
```

In `config/sanctum.php`:
```php
'guard' => ['web', 'service_admin', 'tenant_admin'],
```

## 5. Add routes to routes/api.php
```php
use App\Http\Controllers\Admin\PlatformAdminAuthController;
use App\Http\Controllers\Admin\FeatureFlagController;
use App\Http\Controllers\Admin\AuditLogController;
 
// Platform admin auth — login is public, others need a token
Route::prefix('admin/auth')->group(function () {
    Route::post('login', [PlatformAdminAuthController::class, 'login']);
 
    Route::middleware(['auth:sanctum', 'ensure.service.admin'])->group(function () {
        Route::post('mfa/verify', [PlatformAdminAuthController::class, 'verifyMfa']);
        Route::post('logout',     [PlatformAdminAuthController::class, 'logout']);
    });
});
 
// Feature flags + audit logs (service admin only)
Route::middleware(['auth:sanctum', 'ensure.service.admin'])->prefix('admin')->group(function () {
 
    Route::get('feature-flags',  [FeatureFlagController::class, 'index']);
    Route::post('feature-flags', [FeatureFlagController::class, 'store']);
    Route::put('feature-flags/{flagId}/tenants/{tenantId}', [FeatureFlagController::class, 'setTenantOverride']);
    Route::post('feature-flags/{flagId}/rollout',           [FeatureFlagController::class, 'rollout']);
 
    Route::get('audit-logs', [AuditLogController::class, 'index']);
 
});
```

## 6. Create a test tenant admin via tinker
```bash
php artisan tinker
>>> \App\Models\TenantAdmin::create([
...     'id'        => \Illuminate\Support\Str::uuid(),
...     'tenant_id' => '<your-tenant-uuid-from-step-8>',
...     'name'      => 'Idol Admin',
...     'email'     => 'admin@sakura.com',
...     'password'  => bcrypt('password'),
... ]);
```

## 7. All requests require X-Tenant-ID header
Every request to `/api/manage/*` must include:
```
X-Tenant-ID: <tenant-uuid>
```

## 8. Endpoints available after this step
| Method | URI | Middleware | Description |
|---|---|---|---|
| POST | `/api/manage/auth/login` | `resolve.tenant` | Tenant admin login |
| POST | `/api/manage/auth/logout` | `resolve.tenant` + `ensure.tenant.admin` | Logout |
| GET  | `/api/manage/idol/profile` | `resolve.tenant` + `ensure.tenant.admin` | Get idol profile |
| PUT  | `/api/manage/idol/profile` | `resolve.tenant` + `ensure.tenant.admin` | Update idol profile |
| POST | `/api/manage/idol/social-links` | `resolve.tenant` + `ensure.tenant.admin` | Upsert social link |
| GET  | `/api/manage/idol/groups` | `resolve.tenant` + `ensure.tenant.admin` | List groups |
| POST | `/api/manage/idol/groups` | `resolve.tenant` + `ensure.tenant.admin` | Create group |

## 9. Test flow
```
# 1. Login as tenant admin
POST /api/manage/auth/login
X-Tenant-ID: <tenant-uuid>
{ "email": "admin@sakura.com", "password": "password" }

# 2. Use returned token + tenant header for all subsequent calls
GET /api/manage/idol/profile
X-Tenant-ID: <tenant-uuid>
Authorization: Bearer <token>

# 3. Update the profile (multipart)
PUT /api/manage/idol/profile
X-Tenant-ID: <tenant-uuid>
Authorization: Bearer <token>
Content-Type: multipart/form-data
stage_name: Sakura
bio: K-pop idol from Seoul

# 4. Add a social link
POST /api/manage/idol/social-links
X-Tenant-ID: <tenant-uuid>
Authorization: Bearer <token>
{ "platform": "INSTAGRAM", "url": "https://instagram.com/sakura" }
```

## 10. Note on firstOrCreate for idol profiles
`IdolProfileController::show()` and `update()` both use `firstOrCreate` —
this means hitting `GET /api/manage/idol/profile` for the first time will
automatically create a blank profile seeded with the tenant name as `stage_name`.
No separate "create profile" step is needed.
