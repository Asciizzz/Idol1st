<?php

use App\Http\Controllers\SiteCreatorController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'home');

Route::prefix('creator')->group(function (): void {
	Route::get('/signin', [SiteCreatorController::class, 'showSignin'])->name('creator.signin');
	Route::post('/signin', [SiteCreatorController::class, 'signin'])->name('creator.signin.store');

	Route::get('/signup', [SiteCreatorController::class, 'showSignup'])->name('creator.signup');
	Route::post('/signup', [SiteCreatorController::class, 'signup'])->name('creator.signup.store');

	Route::middleware('auth')->group(function (): void {
		Route::post('/signout', [SiteCreatorController::class, 'signout'])->name('creator.signout');
		Route::get('/setup', [SiteCreatorController::class, 'showSetup'])->name('creator.setup');
		Route::post('/setup', [SiteCreatorController::class, 'saveSetup'])->name('creator.setup.store');

		Route::get('/builder', [SiteCreatorController::class, 'showBuilder'])->name('creator.builder');
		Route::post('/builder/save', [SiteCreatorController::class, 'saveBuilder'])->name('creator.builder.save');
	});
});
