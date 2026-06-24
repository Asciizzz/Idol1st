<?php

use App\Http\Controllers\AuthEditorController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/editor');

Route::get('/editor', [AuthEditorController::class, 'showEditor'])->name('editor');
Route::post('/editor/save', [AuthEditorController::class, 'saveEditor'])->name('editor.save');

Route::get('/admin', function () {
    return view('admin');
})->name('admin');
