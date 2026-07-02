# Web Auth Flow — Wire-up Checklist

## 1. File placement summary
| File | Destination |
|---|---|
| `Views/login.blade.php` | `resources/views/login.blade.php` |
| `Views/tenant-panel.blade.php` | `resources/views/tenant-panel.blade.php` (replace existing) |
| `Middleware/RequireAuth.php` | `app/Http/Middleware/RequireAuth.php` |
| `Routes/web.php` | `routes/web.php` (replace existing) |

## 2. Add methods to AuthEditorController
Open `app/Http/Controllers/AuthEditorController.php` and add the four
methods:
- `showLogin()`
- `handleLogin()`
- `webLogout()`
- `showAdmin()`

Also add these imports at the top if not already present:
```php
use Illuminate\Http\RedirectResponse;
```

## 3. Register the middleware
In `bootstrap/app.php`, register the alias inside `withMiddleware()`:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'require.auth' => \App\Http\Middleware\RequireAuth::class,
    ]);
})
```

## 4. Expose the Sanctum token to vsb.js
The updated `tenant-panel.blade.php` sets `window.__VSB_TOKEN__` from the session.
In your `vsb.js`, use it for all API calls:
```js
const token = window.__VSB_TOKEN__;

fetch('/api/projects', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
    }
});
```

## 5. Add a logout button to the editor/admin views
Wherever you want a logout button, use a POST form (required for CSRF protection):
```html
<form method="POST" action="{{ route('logout') }}">
    @csrf
    <button type="submit">Log out</button>
</form>
```

## 6. Full route map after this step
| Method | URI | Middleware | Description |
|---|---|---|---|
| GET | `/login` | — | Show login form |
| POST | `/login` | — | Authenticate + redirect |
| GET | `/editor` | `require.auth` | VSB editor |
| POST | `/editor/save` | `require.auth` | Save graph to disk |
| POST | `/logout` | `require.auth` | Logout + revoke token |
| GET | `/admin` | `require.auth:admin` | Admin panel |

## 7. Test the full flow
```bash
# 1. Create a test user via tinker if you haven't already
php artisan tinker
>>> \App\Models\User::factory()->create([
...     'email' => 'editor@example.com',
...     'password' => bcrypt('password'),
...     'role' => 'editor',
... ]);
>>> \App\Models\User::factory()->create([
...     'email' => 'admin@example.com',
...     'password' => bcrypt('password'),
...     'role' => 'admin',
... ]);

# 2. Serve
php artisan serve

# 3. Visit http://127.0.0.1:8000 — should redirect to /login
# 4. Log in as editor → lands on /editor
# 5. Log in as admin  → lands on /admin
# 6. Try visiting /admin as an editor → 403
```
