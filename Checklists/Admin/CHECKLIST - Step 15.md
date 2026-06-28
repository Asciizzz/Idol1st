# Step 15 — Wire-up Checklist

## 1. Run the migrations
```bash
php artisan migrate
```
One new migration will run:
- `2026_06_26_000026_create_idol_events_table` — creates both `idol_events` and `event_rsvps`

## 2. File placement summary
| File | Destination |
|---|---|
| `migrations/2026_06_26_000026_create_idol_events_table.php` | `database/migrations/` |
| `Models/IdolEvent.php` | `app/Models/` |
| `Models/EventRsvp.php` | `app/Models/` |
| `Resources/IdolEventResource.php` | `app/Http/Resources/` |
| `Requests/Manage/StoreEventRequest.php` | `app/Http/Requests/Manage/` |
| `Requests/Fan/RsvpRequest.php` | `app/Http/Requests/Fan/` |
| `Controllers/Manage/EventController.php` | `app/Http/Controllers/Manage/` |
| `Controllers/Fan/EventController.php` | `app/Http/Controllers/Fan/` |

## 3. Add routes to routes/api.php
Paste the contents of `api_events.php` into `routes/api.php`.

## 4. Endpoints available after this step
| Method | URI | Middleware | Description |
|---|---|---|---|
| GET  | `/api/manage/events` | tenant admin | List all events |
| POST | `/api/manage/events` | tenant admin | Create event |
| GET  | `/api/events` | optional fan auth | List upcoming events |
| POST | `/api/events/{id}/rsvp` | fan auth | Submit / update RSVP |

## 5. Test flow
```
# 1. Create an event as tenant admin
POST /api/manage/events
X-Tenant-ID: <uuid>
Authorization: Bearer <tenant-admin-token>
{
    "title": "Sakura Summer Concert",
    "event_type": "CONCERT",
    "start_datetime": "2026-08-15T19:00:00Z",
    "location": "Tokyo Dome",
    "ticket_url": "https://tickets.example.com",
    "visibility": "PUBLIC"
}

# 2. Browse as fan (no auth needed for PUBLIC events)
GET /api/events
X-Tenant-ID: <uuid>

# 3. RSVP as authenticated fan
POST /api/events/<event-uuid>/rsvp
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token>
{ "status": "GOING" }

# Response includes updated counts:
# { "status": "GOING", "rsvp_counts": { "going": 1, "interested": 0, "not_going": 0 } }

# 4. Update RSVP (upsert — same endpoint)
POST /api/events/<event-uuid>/rsvp
{ "status": "INTERESTED" }
```

## 6. How the visibility gate applies to events
- `PUBLIC` — all fans and guests see full event details
- `SUBSCRIBERS_ONLY` / `PAID_ONLY` — event appears in listing with title/type/dates visible,
  but `location` and `ticket_url` are withheld (set to null)
- RSVP on a gated event returns 403 if the fan doesn't have the required subscription

## 7. RSVP counts use a single aggregation query
`getRsvpCountsAttribute()` runs one `GROUP BY status COUNT(*)` query rather than
three separate `COUNT` calls. On events with thousands of RSVPs this matters.

## 8. Note on appended rsvp_counts and N+1
`rsvp_counts` is an appended attribute on the model, which means listing 20 events
triggers 20 extra queries. For now this is acceptable, but if you need to optimise,
eager-load RSVP counts using a `withCount` approach:

```php
IdolEvent::withCount([
    'rsvps as going_count'      => fn ($q) => $q->where('status', 'GOING'),
    'rsvps as interested_count' => fn ($q) => $q->where('status', 'INTERESTED'),
    'rsvps as not_going_count'  => fn ($q) => $q->where('status', 'NOT_GOING'),
])
```
Then update `getRsvpCountsAttribute()` to use `$this->going_count` etc. if loaded.
