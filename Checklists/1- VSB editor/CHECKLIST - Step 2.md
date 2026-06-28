# Step 2 — Wire-up Checklist

## 1. Run the migration
```bash
php artisan migrate
```

## 2. Register the Policy
In `app/Providers/AppServiceProvider.php`, add to the `boot()` method:

```php
use App\Models\Project;
use App\Policies\ProjectPolicy;
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::policy(Project::class, ProjectPolicy::class);
}
```

Laravel 12 also auto-discovers policies if `Project.php` is in `app/Models/`
and `ProjectPolicy.php` is in `app/Policies/` — so this step may be optional,
but explicit registration is safer.

## 3. Add routes to routes/api.php
```php
use App\Http\Controllers\ProjectController;
 
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('projects', ProjectController::class);
});
```

## 4. File placement summary
| File | Destination |
|---|---|
| `2026_06_26_000002_create_projects_table.php` | `database/migrations/` |
| `Models/Project.php` | `app/Models/` |
| `Policies/ProjectPolicy.php` | `app/Policies/` |
| `Requests/Project/StoreProjectRequest.php` | `app/Http/Requests/Project/` |
| `Requests/Project/UpdateProjectRequest.php` | `app/Http/Requests/Project/` |
| `Resources/ProjectResource.php` | `app/Http/Resources/` |
| `Controllers/ProjectController.php` | `app/Http/Controllers/` |

## 5. Endpoints available after this step
| Method | URI | Description |
|---|---|---|
| GET | `/api/projects` | List own projects (admin sees all) |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/{id}` | Get single project |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |

All routes require `Authorization: Bearer {token}` from Step 1.
