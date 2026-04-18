<?php

use App\Http\Controllers\AuthEditorController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/auth');

Route::get('/auth', [AuthEditorController::class, 'showAuth'])->name('auth');
Route::get('/signin', [AuthEditorController::class, 'showSignin'])->name('signin');
Route::post('/signin', [AuthEditorController::class, 'signin'])->name('signin.store');

Route::get('/signup', [AuthEditorController::class, 'showSignup'])->name('signup');
Route::post('/signup', [AuthEditorController::class, 'signup'])->name('signup.store');

Route::middleware('auth')->group(function (): void {
	Route::post('/signout', [AuthEditorController::class, 'signout'])->name('signout');
	Route::get('/setup', [AuthEditorController::class, 'showSetup'])->name('setup');
	Route::post('/setup', [AuthEditorController::class, 'saveSetup'])->name('setup.store');

	Route::get('/editor', [AuthEditorController::class, 'showEditor'])->name('editor');
	Route::post('/editor/save', [AuthEditorController::class, 'saveEditor'])->name('editor.save');
});
