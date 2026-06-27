<?php

use App\Http\Controllers\AuthEditorController;
use Illuminate\Support\Facades\Route;

// ── Public ────────────────────────────────────────────────────
Route::redirect('/', '/login');

Route::get('/login',  [AuthEditorController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthEditorController::class, 'handleLogin'])->name('login.submit');

// ── Authenticated ─────────────────────────────────────────────
Route::middleware('require.auth')->group(function () {
    Route::get('/editor',       [AuthEditorController::class, 'showEditor'])->name('editor');
    Route::post('/editor/save', [AuthEditorController::class, 'saveEditor'])->name('editor.save');
    Route::post('/logout',      [AuthEditorController::class, 'webLogout'])->name('logout');
});

// ── Admin only ────────────────────────────────────────────────
Route::middleware('require.auth:admin')->group(function () {
    Route::get('/admin', [AuthEditorController::class, 'showAdmin'])->name('admin');
});
