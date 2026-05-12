<?php

use App\Http\Controllers\AuthEditorController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/editor');

Route::redirect('/auth', '/editor')->name('auth');
Route::redirect('/login', '/editor')->name('login');
Route::post('/login', [AuthEditorController::class, 'login'])->name('login.store');

Route::redirect('/signup', '/editor')->name('signup');
Route::post('/signup', [AuthEditorController::class, 'signup'])->name('signup.store');

Route::post('/signout', [AuthEditorController::class, 'signout'])->name('signout');
Route::get('/editor', [AuthEditorController::class, 'showEditor'])->name('editor');
Route::post('/editor/save', [AuthEditorController::class, 'saveEditor'])->name('editor.save');
