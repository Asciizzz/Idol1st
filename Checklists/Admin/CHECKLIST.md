# Step 17 — Wire-up Checklist

## 1. Run the migrations
```bash
php artisan migrate
```
One new migration will run:
- `2026_06_26_000027_create_fan_notifications_table` — creates both tables

## 2. File placement summary
| File | Destination |
|---|---|
| `migrations/2026_06_26_000027_create_fan_notifications_table.php` | `database/migrations/` |
| `Models/FanNotification.php` | `app/Models/` |
| `Models/NotificationPreference.php` | `app/Models/` |
| `Services/NotificationService.php` | `app/Services/` |
| `Resources/FanNotificationResource.php` | `app/Http/Resources/` |
| `Resources/NotificationPreferenceResource.php` | `app/Http/Resources/` |
| `Requests/Fan/UpdateNotificationPreferencesRequest.php` | `app/Http/Requests/Fan/` |
| `Controllers/Fan/NotificationController.php` | `app/Http/Controllers/Fan/` |
| `notification_hooks.php` | Reference only — see step 4 below |

## 3. Add routes to routes/api.php
Paste the contents of `api_notifications.php` into `routes/api.php`.

## 4. Wire notification hooks into prior controllers
The `notification_hooks.php` file contains snippets for each trigger point.
Add them to the relevant controllers:

**`app/Http/Controllers/Manage/BlogController.php` — `publish()` method:**
After `$post->update([...])`:
```php
app(\App\Services\NotificationService::class)->broadcast(
    app(\App\Models\Tenant::class), 'NEW_POST',
    "New post: {$post->title}", $post->id, 'BlogPost',
);
```

**`app/Http/Controllers/Manage/MerchController.php` — `store()` method:**
After the product is created inside `DB::transaction`:
```php
app(\App\Services\NotificationService::class)->broadcast(
    app(\App\Models\Tenant::class), 'NEW_MERCH',
    "New merch available: {$product->name}", $product->id, 'MerchProduct',
);
```

**`app/Http/Controllers/Manage/EventController.php` — `store()` method:**
After `IdolEvent::create([...])`:
```php
app(\App\Services\NotificationService::class)->broadcast(
    app(\App\Models\Tenant::class), 'EVENT_REMINDER',
    "New event: {$event->title}", $event->id, 'IdolEvent',
);
```

**`app/Http/Controllers/Fan/FanSubscriptionController.php` — `cancel()` method:**
After `$subscription->update([...])`:
```php
app(\App\Services\NotificationService::class)->notify(
    $fan, 'SUBSCRIPTION_EXPIRY',
    'Your membership has been cancelled.',
    $subscription->id, 'FanSubscription',
);
```

## 5. Endpoints available after this step
| Method | URI | Middleware | Description |
|---|---|---|---|
| GET  | `/api/notifications` | fan auth | List notifications + unread count |
| POST | `/api/notifications/read-all` | fan auth | Mark all as read |
| GET  | `/api/notifications/preferences` | fan auth | Get preferences |
| PUT  | `/api/notifications/preferences` | fan auth | Bulk upsert preferences |

## 6. Test flow
```
# 1. Publish a blog post as tenant admin — fans should receive a notification
POST /api/manage/blog/posts/<uuid>/publish
X-Tenant-ID: <uuid>
Authorization: Bearer <tenant-admin-token>

# 2. Check fan notifications
GET /api/notifications
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token>
# Response includes unread_count and the NEW_POST notification

# 3. Mark all read
POST /api/notifications/read-all
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token>

# 4. Disable NEW_POST notifications via preferences
PUT /api/notifications/preferences
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token>
[{ "type": "NEW_POST", "is_enabled": false, "channel": "IN_APP" }]
```

## 7. Broadcast uses chunked inserts
`NotificationService::broadcast()` chunks fans in batches of 200 and uses
`FanNotification::insert()` (bulk insert) rather than creating records one at a time.
This prevents memory issues on tenants with thousands of fans.

For very large tenants (10k+ fans), move the broadcast call into a queued job:
```php
// In BlogController::publish():
dispatch(new \App\Jobs\BroadcastNotification(
    $tenant, 'NEW_POST', "New post: {$post->title}", $post->id, 'BlogPost'
));
```

## 8. Preferences default to enabled
If a fan has no preference record for a given type + channel, notifications
are sent by default. Only explicit `is_enabled: false` records suppress them.
This means new fans receive all notifications until they opt out.

## 9. readAll uses a single bulk UPDATE
`FanNotification::where(...)->update(['is_read' => true])` runs one SQL statement
regardless of how many notifications exist. Never load all records into memory
just to mark them read.

## 10. upsert() for preference updates
`NotificationPreference::upsert()` handles the full array in one query with
conflict resolution on `[fan_id, type, channel]`. This is more efficient than
looping `updateOrCreate()` for each preference row.
