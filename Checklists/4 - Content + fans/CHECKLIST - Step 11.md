# Step 11 — Wire-up Checklist

## 1. Run the migrations
```bash
php artisan migrate
```
Three new migrations will run:
- `2026_06_26_000016_create_blog_categories_table`
- `2026_06_26_000017_create_blog_posts_table`
- `2026_06_26_000018_create_blog_comments_table`

## 2. File placement summary
| File | Destination |
|---|---|
| `migrations/2026_06_26_000016_create_blog_categories_table.php` | `database/migrations/` |
| `migrations/2026_06_26_000017_create_blog_posts_table.php` | `database/migrations/` |
| `migrations/2026_06_26_000018_create_blog_comments_table.php` | `database/migrations/` |
| `Models/BlogCategory.php` | `app/Models/` |
| `Models/BlogPost.php` | `app/Models/` |
| `Models/BlogComment.php` | `app/Models/` |
| `Models/BlogPostLike.php` | `app/Models/` |
| `Services/VisibilityGateService.php` | `app/Services/` |
| `Resources/BlogCategoryResource.php` | `app/Http/Resources/` |
| `Resources/BlogPostResource.php` | `app/Http/Resources/` |
| `Resources/BlogCommentResource.php` | `app/Http/Resources/` |
| `Requests/Manage/StoreBlogPostRequest.php` | `app/Http/Requests/Manage/` |
| `Requests/Fan/StoreBlogCommentRequest.php` | `app/Http/Requests/Fan/` |
| `Controllers/Manage/BlogController.php` | `app/Http/Controllers/Manage/` |
| `Controllers/Fan/BlogController.php` | `app/Http/Controllers/Fan/` |

Note: create `app/Services/` and `app/Http/Controllers/Fan/` directories if they don't exist.

## 3. Add routes to routes/api.php
```php
use App\Http\Controllers\Manage\BlogController as ManageBlogController;
use App\Http\Controllers\Fan\BlogController as FanBlogController;
 
// ── Tenant admin blog management ──────────────────────────────
Route::middleware(['resolve.tenant', 'auth:sanctum', 'ensure.tenant.admin'])
    ->prefix('manage/blog')
    ->group(function () {
        Route::get('posts',                        [ManageBlogController::class, 'index']);
        Route::post('posts',                       [ManageBlogController::class, 'store']);
        Route::post('posts/{postId}/publish',      [ManageBlogController::class, 'publish']);
        Route::post('comments/{commentId}/hide',   [ManageBlogController::class, 'hideComment']);
    });
 
// ── Fan-facing blog (optional fan auth) ───────────────────────
// resolve.tenant runs for all; auth:sanctum is optional (guests can browse PUBLIC posts)
Route::middleware('resolve.tenant')
    ->prefix('blog')
    ->group(function () {
        Route::get('posts',              [FanBlogController::class, 'index']);
        Route::get('posts/{postId}',     [FanBlogController::class, 'show']);
        Route::get('posts/{postId}/comments', [FanBlogController::class, 'comments']);
 
        // These require fan auth
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('posts/{postId}/like',     [FanBlogController::class, 'like']);
            Route::post('posts/{postId}/comments', [FanBlogController::class, 'storeComment']);
        });
    });
```

## 4. Note on fan FK constraints
`blog_comments.fan_id` and `blog_post_likes.fan_id` don't have FK constraints yet
because the `fans` table doesn't exist until Step 12. The columns are plain UUIDs
for now — Step 12 will add the FK constraints via a follow-up migration.

## 5. VisibilityGateService binding (optional)
Laravel will auto-resolve `VisibilityGateService` via the container since it has
no special constructor dependencies. No binding needed in `AppServiceProvider`.

## 6. Endpoints available after this step
| Method | URI | Middleware | Description |
|---|---|---|---|
| GET    | `/api/manage/blog/posts` | tenant admin | List all posts (any status) |
| POST   | `/api/manage/blog/posts` | tenant admin | Create post |
| POST   | `/api/manage/blog/posts/{id}/publish` | tenant admin | Publish a draft |
| POST   | `/api/manage/blog/comments/{id}/hide` | tenant admin | Hide a comment |
| GET    | `/api/blog/posts` | optional fan auth | List published posts |
| GET    | `/api/blog/posts/{id}` | optional fan auth | Get single post |
| GET    | `/api/blog/posts/{id}/comments` | none | List visible comments |
| POST   | `/api/blog/posts/{id}/like` | fan auth | Toggle like |
| POST   | `/api/blog/posts/{id}/comments` | fan auth | Post a comment |

## 7. How the visibility gate works
- `PUBLIC` — anyone can read full content, authenticated or not
- `SUBSCRIBERS_ONLY` — fan must have an ACTIVE subscription of any tier
- `PAID_ONLY` — fan must have an ACTIVE subscription with `price > 0`

On the **list** endpoint, gated posts are still returned but with `content: null`
so fans can see what posts exist and are incentivised to subscribe.
On the **show** endpoint, a 403 is returned if the fan can't access the content.

## 8. Test flow (once Step 12 fan auth exists)
```
# 1. Create a blog post as tenant admin
POST /api/manage/blog/posts
X-Tenant-ID: <uuid>
Authorization: Bearer <tenant-admin-token>
{ "title": "Hello fans!", "content": "...", "visibility": "PUBLIC", "status": "PUBLISHED" }

# 2. Browse as a guest (no token)
GET /api/blog/posts
X-Tenant-ID: <uuid>

# 3. Try a SUBSCRIBERS_ONLY post without a subscription — get 403
GET /api/blog/posts/<post-uuid>
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token-without-subscription>
```

## 9. Retroactively add fan FK constraints in Step 12
After Step 12 creates the `fans` table, add this migration to enforce the FK:
```php
Schema::table('blog_comments', function (Blueprint $table) {
    $table->foreign('fan_id')->references('id')->on('fans')->cascadeOnDelete();
});
Schema::table('blog_post_likes', function (Blueprint $table) {
    $table->foreign('fan_id')->references('id')->on('fans')->cascadeOnDelete();
});
```
This is included automatically in the Step 12 migration.
