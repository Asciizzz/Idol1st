# Step 12 — Wire-up Checklist

## 1. Run the migrations
```bash
php artisan migrate
```
Three new migrations will run:
- `2026_06_26_000019_create_fans_table` — also adds FK constraints to blog_comments and blog_post_likes
- `2026_06_26_000020_create_membership_tiers_table`
- `2026_06_26_000021_create_fan_subscriptions_table`

## 2. File placement summary
| File | Destination |
|---|---|
| `migrations/2026_06_26_000019_create_fans_table.php` | `database/migrations/` |
| `migrations/2026_06_26_000020_create_membership_tiers_table.php` | `database/migrations/` |
| `migrations/2026_06_26_000021_create_fan_subscriptions_table.php` | `database/migrations/` |
| `Models/Fan.php` | `app/Models/` |
| `Models/MembershipTier.php` | `app/Models/` |
| `Models/TierPerk.php` | `app/Models/` |
| `Models/FanSubscription.php` | `app/Models/` |
| `Middleware/EnsureFan.php` | `app/Http/Middleware/` |
| `Resources/FanResource.php` | `app/Http/Resources/` |
| `Resources/MembershipTierResource.php` | `app/Http/Resources/` |
| `Resources/TierPerkResource.php` | `app/Http/Resources/` |
| `Resources/FanSubscriptionResource.php` | `app/Http/Resources/` |
| `Requests/Fan/RegisterFanRequest.php` | `app/Http/Requests/Fan/` |
| `Requests/Fan/LoginFanRequest.php` | `app/Http/Requests/Fan/` |
| `Requests/Fan/SubscribeRequest.php` | `app/Http/Requests/Fan/` |
| `Requests/Fan/UpgradeSubscriptionRequest.php` | `app/Http/Requests/Fan/` |
| `Requests/Manage/StoreMembershipTierRequest.php` | `app/Http/Requests/Manage/` |
| `Controllers/Fan/FanAuthController.php` | `app/Http/Controllers/Fan/` |
| `Controllers/Fan/FanSubscriptionController.php` | `app/Http/Controllers/Fan/` |
| `Controllers/Manage/MembershipTierController.php` | `app/Http/Controllers/Manage/` |

## 3. Register EnsureFan middleware alias
In `bootstrap/app.php`:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'require.auth'         => \App\Http\Middleware\RequireAuth::class,
        'ensure.admin'         => \App\Http\Middleware\EnsureAdmin::class,
        'resolve.tenant'       => \App\Http\Middleware\ResolveTenant::class,
        'ensure.service.admin' => \App\Http\Middleware\EnsureServiceAdmin::class,
        'ensure.tenant.admin'  => \App\Http\Middleware\EnsureTenantAdmin::class,
        'ensure.fan'           => \App\Http\Middleware\EnsureFan::class, // add this
    ]);
})
```

## 4. Register Fan as a Sanctum authenticatable model
In `config/auth.php`:
```php
'guards' => [
    // ... existing guards
    'fan' => ['driver' => 'sanctum', 'provider' => 'fans'],
],
'providers' => [
    // ... existing providers
    'fans' => ['driver' => 'eloquent', 'model' => App\Models\Fan::class],
],
```

In `config/sanctum.php`:
```php
'guard' => ['web', 'service_admin', 'tenant_admin', 'fan'],
```

## 5. Add routes to routes/api.php
Paste the contents of `api_membership.php` into `routes/api.php`.

## 6. Endpoints available after this step
| Method | URI | Middleware | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `resolve.tenant` | Fan registration |
| POST | `/api/auth/login` | `resolve.tenant` | Fan login |
| POST | `/api/auth/logout` | `resolve.tenant` + fan auth | Fan logout |
| GET  | `/api/membership/tiers` | `resolve.tenant` | Browse tiers (public) |
| POST | `/api/membership/subscribe` | fan auth | Subscribe to a tier |
| GET  | `/api/membership/subscription` | fan auth | View current subscription |
| POST | `/api/membership/subscription/cancel` | fan auth | Cancel subscription |
| POST | `/api/membership/subscription/upgrade` | fan auth | Upgrade tier |
| GET  | `/api/manage/membership/tiers` | tenant admin | List tiers (admin view) |
| POST | `/api/manage/membership/tiers` | tenant admin | Create tier with perks |

## 7. Test flow
```
# 1. Create a membership tier as tenant admin
POST /api/manage/membership/tiers
X-Tenant-ID: <uuid>
Authorization: Bearer <tenant-admin-token>
{
    "name": "Star Fan",
    "price": 9.99,
    "billing_cycle": "MONTHLY",
    "perks": [
        { "description": "Exclusive posts", "perk_type": "EXCLUSIVE_CONTENT" },
        { "description": "Early merch access", "perk_type": "EARLY_ACCESS" }
    ]
}

# 2. Register a fan
POST /api/auth/register
X-Tenant-ID: <uuid>
{
    "email": "fan@example.com",
    "username": "sakurafan01",
    "password": "password",
    "password_confirmation": "password"
}

# 3. Subscribe to the tier
POST /api/membership/subscribe
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token>
{ "tier_id": "<tier-uuid>", "payment_method": "STRIPE" }

# 4. Try accessing a SUBSCRIBERS_ONLY blog post
GET /api/blog/posts/<post-uuid>
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token>
# Should now return full content instead of 403
```

## 8. Note on payment flow
`subscribe` currently sets status to `ACTIVE` immediately as a stub.
Once Step 14 (webhooks) is implemented, the flow will be:
- `subscribe` creates subscription with status `PENDING`
- Webhook fires on payment confirmation → sets status to `ACTIVE`
- Webhook fires on payment failure → sets status to `CANCELLED`
The stub approach means subscriptions work end-to-end now without payment integration.

## 9. VisibilityGateService now fully functional
Now that `fans` and `fan_subscriptions` tables exist, the `VisibilityGateService`
from Step 11 is fully operational. The `SUBSCRIBERS_ONLY` and `PAID_ONLY` gates
will correctly check the fan's subscription status.
