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
