<?php

// Auth routes

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthEditorController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SnapshotController;
use App\Http\Controllers\CompilerController;
use App\Http\Controllers\PublishController;
use App\Http\Controllers\AdminController;

use App\Http\Controllers\Admin\TenantController;
use App\Http\Controllers\Admin\PlanController;

use App\Http\Controllers\Admin\PlatformAdminAuthController;
use App\Http\Controllers\Admin\FeatureFlagController;
use App\Http\Controllers\Admin\AuditLogController;

use App\Http\Controllers\Manage\TenantAdminAuthController;
use App\Http\Controllers\Manage\IdolProfileController;
use App\Http\Controllers\Manage\SocialLinkController;
use App\Http\Controllers\Manage\IdolGroupController;

use App\Http\Controllers\Manage\BlogController as ManageBlogController;
use App\Http\Controllers\Fan\BlogController as FanBlogController;

// Public auth routes (no Sanctum guard required)
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthEditorController::class, 'login']);
});

// Protected auth routes (requires valid Sanctum token)
Route::middleware('auth:sanctum')->prefix('auth')->group(function () {
    Route::post('logout', [AuthEditorController::class, 'logout']);
    Route::get('me',      [AuthEditorController::class, 'me']);
});

// Project routes
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('projects', ProjectController::class);

    Route::prefix('projects/{project}')->group(function () {
        Route::get('snapshots',           [SnapshotController::class, 'index']);
        Route::post('snapshots',          [SnapshotController::class, 'store']);
        Route::get('snapshots/{version}', [SnapshotController::class, 'show'])
            ->where('version', '[0-9]+');
    });

    Route::post('projects/{project}/compile', [CompilerController::class, 'compile']);

    Route::prefix('projects/{project}')->group(function () {
        Route::post('publish',    [PublishController::class, 'publish']);
        Route::get('published',   [PublishController::class, 'show']);
    });
});

// Tenant management (admin only)
Route::middleware(['auth:sanctum', 'ensure.admin'])->prefix('admin')->group(function () {
    Route::get('users',    [AdminController::class, 'users']);
    Route::get('projects', [AdminController::class, 'projects']);
    Route::get('stats',    [AdminController::class, 'stats']);

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

// Tenant admin login — only needs resolve.tenant, no admin auth yet
Route::middleware('resolve.tenant')->prefix('manage')->group(function () {
    Route::post('auth/login', [TenantAdminAuthController::class, 'login']);
});

// Authenticated tenant admin routes
Route::middleware(['resolve.tenant', 'auth:sanctum', 'ensure.tenant.admin'])->prefix('manage')->group(function () {

    // Auth
    Route::post('auth/logout', [TenantAdminAuthController::class, 'logout']);

    // Idol profile
    Route::get('idol/profile',      [IdolProfileController::class, 'show']);
    Route::put('idol/profile',      [IdolProfileController::class, 'update']);
    Route::post('idol/social-links',[SocialLinkController::class,  'upsert']);

    // Idol groups
    Route::get('idol/groups',  [IdolGroupController::class, 'index']);
    Route::post('idol/groups', [IdolGroupController::class, 'store']);

});

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
