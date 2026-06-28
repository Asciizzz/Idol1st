# Step 8 — Wire-up Checklist

## 1. Run the migrations (in order)
```bash
php artisan migrate
```
Three new migrations will run:
- `2026_06_26_000006_create_plans_table`
- `2026_06_26_000007_create_tenants_table`
- `2026_06_26_000008_create_tenant_subscriptions_table`

## 2. File placement summary
| File | Destination |
|---|---|
| `migrations/2026_06_26_000006_create_plans_table.php` | `database/migrations/` |
| `migrations/2026_06_26_000007_create_tenants_table.php` | `database/migrations/` |
| `migrations/2026_06_26_000008_create_tenant_subscriptions_table.php` | `database/migrations/` |
| `Models/Plan.php` | `app/Models/` |
| `Models/Tenant.php` | `app/Models/` |
| `Models/TenantSubscription.php` | `app/Models/` |
| `Middleware/ResolveTenant.php` | `app/Http/Middleware/` |
| `Resources/PlanResource.php` | `app/Http/Resources/` |
| `Resources/TenantResource.php` | `app/Http/Resources/` |
| `Resources/TenantSubscriptionResource.php` | `app/Http/Resources/` |
| `Requests/Admin/StoreTenantRequest.php` | `app/Http/Requests/Admin/` |
| `Requests/Admin/StorePlanRequest.php` | `app/Http/Requests/Admin/` |
| `Requests/Admin/SuspendTenantRequest.php` | `app/Http/Requests/Admin/` |
| `Requests/Admin/AssignPlanRequest.php` | `app/Http/Requests/Admin/` |
| `Controllers/TenantController.php` | `app/Http/Controllers/Admin/` |
| `Controllers/PlanController.php` | `app/Http/Controllers/Admin/` |

Note: create the `Admin/` subdirectory inside `Controllers/` and `Requests/` if it doesn't exist yet.

## 3. Register the ResolveTenant middleware alias
In `bootstrap/app.php`, add `resolve.tenant` alongside existing aliases:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'require.auth'   => \App\Http\Middleware\RequireAuth::class,
        'ensure.admin'   => \App\Http\Middleware\EnsureAdmin::class,
        'resolve.tenant' => \App\Http\Middleware\ResolveTenant::class, // add this
    ]);
})
```

## 4. Add routes to routes/api.php
```php
use App\Http\Controllers\Admin\TenantController;
use App\Http\Controllers\Admin\PlanController;
 
// Tenant management (admin only)
Route::middleware(['auth:sanctum', 'ensure.admin'])->prefix('admin')->group(function () {
 
    // Plans
    Route::get('plans',  [PlanController::class, 'index']);
    Route::post('plans', [PlanController::class, 'store']);
 
    // Tenants
    Route::get('tenants',    [TenantController::class, 'index']);
    Route::post('tenants',   [TenantController::class, 'store']);
 
    Route::prefix('tenants/{tenantId}')->group(function () {
        Route::get('/',           [TenantController::class, 'show']);
        Route::patch('/',         [TenantController::class, 'update']);
        Route::post('suspend',    [TenantController::class, 'suspend']);
        Route::post('reactivate', [TenantController::class, 'reactivate']);
        Route::post('impersonate',[TenantController::class, 'impersonate']);
        Route::put('plan',        [TenantController::class, 'assignPlan']);
    });
 
});
```

## 5. Endpoints available after this step
| Method | URI | Description |
|---|---|---|
| GET    | `/api/admin/plans` | List all plans |
| POST   | `/api/admin/plans` | Create a plan |
| GET    | `/api/admin/tenants` | List tenants (filter by status/search) |
| POST   | `/api/admin/tenants` | Create tenant + subscription |
| GET    | `/api/admin/tenants/{id}` | Get single tenant |
| PATCH  | `/api/admin/tenants/{id}` | Update tenant name/config |
| POST   | `/api/admin/tenants/{id}/suspend` | Suspend tenant |
| POST   | `/api/admin/tenants/{id}/reactivate` | Reactivate tenant |
| POST   | `/api/admin/tenants/{id}/impersonate` | Get impersonation token |
| PUT    | `/api/admin/tenants/{id}/plan` | Change tenant plan |

All routes require an admin Bearer token from Step 1.

## 6. Test flow
```bash
# 1. Create a plan first
POST /api/admin/plans
{ "name": "Starter", "price": 9.99, "billing_cycle": "MONTHLY" }

# 2. Create a tenant using the returned plan id
POST /api/admin/tenants
{ "name": "Sakura Fan Site", "plan_id": "<uuid from step 1>" }

# 3. Verify the tenant shows its subscription
GET /api/admin/tenants/<tenant-uuid>
```

## 7. Using ResolveTenant in subsequent steps
All fan-facing and tenant-admin routes from Step 9 onward must include
`resolve.tenant` in their middleware stack and pass the tenant ID as a header:
```
X-Tenant-ID: <tenant-uuid>
```

## 8. Notes on UUID primary keys
Tables in this step and all future steps use UUID primary keys. If you query
them via tinker, use string UUIDs not integers:
```php
Tenant::find('uuid-here');  // correct
Tenant::find(1);            // won't work
```
