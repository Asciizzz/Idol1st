# Step 16 — Wire-up Checklist

## 1. No new migrations
Step 16 reuses the `fans` table from Step 12 and `addresses` table from Step 13.

## 2. File placement summary
| File | Destination |
|---|---|
| `Requests/Fan/UpdateFanProfileRequest.php` | `app/Http/Requests/Fan/` |
| `Controllers/Fan/FanProfileController.php` | `app/Http/Controllers/Fan/` |
| `Controllers/Fan/AddressController.php` | `app/Http/Controllers/Fan/` |

`FanResource` and `AddressResource` from Steps 12 and 13 are reused — no new resources needed.
`StoreAddressRequest` from Step 13 is reused for the address store endpoint.

## 3. Add routes to routes/api.php
```php
use App\Http\Controllers\Fan\FanProfileController;
use App\Http\Controllers\Fan\AddressController;
 
Route::middleware(['resolve.tenant', 'auth:sanctum', 'ensure.fan'])
    ->prefix('profile')
    ->group(function () {
        Route::get('/',         [FanProfileController::class, 'show']);
        Route::patch('/',       [FanProfileController::class, 'update']);
        Route::get('addresses', [AddressController::class, 'index']);
        Route::post('addresses',[AddressController::class, 'store']);
    });
```

## 4. Endpoints available after this step
| Method | URI | Middleware | Description |
|---|---|---|---|
| GET   | `/api/profile` | fan auth | Get fan profile + subscription |
| PATCH | `/api/profile` | fan auth | Update display name / avatar |
| GET   | `/api/profile/addresses` | fan auth | List saved addresses |
| POST  | `/api/profile/addresses` | fan auth | Add a new address |

## 5. Test flow
```
# 1. Get current profile
GET /api/profile
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token>

# 2. Update display name
PATCH /api/profile
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token>
Content-Type: application/json
{ "display_name": "Sakura's #1 Fan" }

# 3. Upload avatar (multipart)
PATCH /api/profile
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token>
Content-Type: multipart/form-data
avatar: [image file]

# 4. Add a default shipping address (needed before checkout)
POST /api/profile/addresses
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token>
{
    "street": "1-2-3 Shibuya",
    "city": "Tokyo",
    "country": "JP",
    "postal_code": "150-0002",
    "is_default": true
}
```

## 6. First address is auto-default
If a fan has no addresses yet, `store` sets `is_default = true` automatically
regardless of what was passed. This ensures checkout always has a usable default
address without requiring the fan to explicitly flag one.

## 7. Default address swap is transactional
The "unset old default → set new default" pair runs inside a DB transaction.
Without this, a race condition could leave a fan with either no default address
or two default addresses if two requests arrive simultaneously.

## 8. Avatar storage path
Avatars are stored at `avatars/{fan_id}/{uuid}.{ext}` on the public disk,
matching the pattern used for idol profile images in Step 10. Old avatars are
deleted before uploading the new one to prevent orphaned files.
