# Step 9 — Wire-up Checklist

## 1. Install the Google2FA package (for MFA)
```bash
composer require pragmarx/google2fa
```

## 2. Run the migrations
```bash
php artisan migrate
```
Three new migrations will run:
- `2026_06_26_000009_create_service_admins_table` — also adds FK from `tenants.created_by`
- `2026_06_26_000010_create_feature_flags_table`
- `2026_06_26_000011_create_audit_logs_table`

## 3. File placement summary
| File | Destination |
|---|---|
| `migrations/2026_06_26_000009_create_service_admins_table.php` | `database/migrations/` |
| `migrations/2026_06_26_000010_create_feature_flags_table.php` | `database/migrations/` |
| `migrations/2026_06_26_000011_create_audit_logs_table.php` | `database/migrations/` |
| `Models/ServiceAdmin.php` | `app/Models/` |
| `Models/FeatureFlag.php` | `app/Models/` |
| `Models/AuditLog.php` | `app/Models/` |
| `Middleware/EnsureServiceAdmin.php` | `app/Http/Middleware/` |
| `Resources/ServiceAdminResource.php` | `app/Http/Resources/` |
| `Resources/FeatureFlagResource.php` | `app/Http/Resources/` |
| `Resources/AuditLogResource.php` | `app/Http/Resources/` |
| `Requests/Admin/PlatformLoginRequest.php` | `app/Http/Requests/Admin/` |
| `Requests/Admin/MfaVerifyRequest.php` | `app/Http/Requests/Admin/` |
| `Requests/Admin/StoreFeatureFlagRequest.php` | `app/Http/Requests/Admin/` |
| `Requests/Admin/FeatureFlagOverrideRequest.php` | `app/Http/Requests/Admin/` |
| `Controllers/PlatformAdminAuthController.php` | `app/Http/Controllers/Admin/` |
| `Controllers/FeatureFlagController.php` | `app/Http/Controllers/Admin/` |
| `Controllers/AuditLogController.php` | `app/Http/Controllers/Admin/` |

## 4. Register the EnsureServiceAdmin middleware alias
In `bootstrap/app.php`, add `ensure.service.admin` alongside existing aliases:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'require.auth'        => \App\Http\Middleware\RequireAuth::class,
        'ensure.admin'        => \App\Http\Middleware\EnsureAdmin::class,
        'resolve.tenant'      => \App\Http\Middleware\ResolveTenant::class,
        'ensure.service.admin'=> \App\Http\Middleware\EnsureServiceAdmin::class, // add this
    ]);
})
```

## 5. Register ServiceAdmin as a Sanctum authenticatable model
In `config/auth.php`, add a guard for service admins:
```php
'guards' => [
    'web'           => ['driver' => 'session', 'provider' => 'users'],
    'sanctum'       => ['driver' => 'sanctum',  'provider' => 'users'],
    'service_admin' => ['driver' => 'sanctum',  'provider' => 'service_admins'],
],

'providers' => [
    'users'          => ['driver' => 'eloquent', 'model' => App\Models\User::class],
    'service_admins' => ['driver' => 'eloquent', 'model' => App\Models\ServiceAdmin::class],
],
```

Also add `ServiceAdmin` to Sanctum's model list in `config/sanctum.php`:
```php
'guard' => ['web', 'service_admin'],
```

## 6. Add routes to routes/api.php
Paste the contents of `api_platform_admin.php` into `routes/api.php`.

## 7. Create your first service admin via tinker
```bash
php artisan tinker
>>> \App\Models\ServiceAdmin::create([
...     'id'       => \Illuminate\Support\Str::uuid(),
...     'email'    => 'superadmin@idol1st.com',
...     'password' => bcrypt('password'),
...     'role'     => 'SUPER_ADMIN',
... ]);
```

## 8. Endpoints available after this step
| Method | URI | Middleware | Description |
|---|---|---|---|
| POST | `/api/admin/auth/login` | public | Service admin login |
| POST | `/api/admin/auth/mfa/verify` | `ensure.service.admin` | Verify TOTP code |
| POST | `/api/admin/auth/logout` | `ensure.service.admin` | Logout |
| GET  | `/api/admin/feature-flags` | `ensure.service.admin` | List flags |
| POST | `/api/admin/feature-flags` | `ensure.service.admin` | Create flag |
| PUT  | `/api/admin/feature-flags/{id}/tenants/{tenantId}` | `ensure.service.admin` | Per-tenant override |
| POST | `/api/admin/feature-flags/{id}/rollout` | `ensure.service.admin` | Global rollout |
| GET  | `/api/admin/audit-logs` | `ensure.service.admin` | Query audit logs |

## 9. Using AuditLog::record() in other controllers
From Step 8 onward, call this helper whenever a significant action is taken:
```php
use App\Models\AuditLog;

// In TenantController::suspend() for example:
AuditLog::record('TENANT_SUSPENDED', 'Tenant', $tenant->id, $tenant->id, $admin->id);
```
You can retroactively add `AuditLog::record()` calls to the Step 8 controllers now that the model exists.

## 10. MFA note
MFA verification currently uses `pragmarx/google2fa` for TOTP.
If you want to skip MFA for now during development, create service admins
with `mfa_enabled = false` — the login will return `mfa_required: false`
and the client can proceed without hitting `/mfa/verify`.
