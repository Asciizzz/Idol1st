<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthEditorController;
use App\Http\Controllers\FanSiteController;


// =====================================================
// FAN TENANT SITE
// =====================================================

Route::domain('{tenant}.idol1st.test')
    ->middleware('resolve.tenant')
    ->group(function () {
        Route::get(
            '/',
            [FanSiteController::class, 'home']
        )->name('fan.home');

        Route::get(
            '/login',
            [FanSiteController::class, 'login']
        )->name('fan.login');

        Route::post(
            '/login',
            [FanSiteController::class, 'loginSubmit']
        )->name('fan.login.submit');

        Route::post(
            '/logout',
            [FanSiteController::class, 'logout']
        )->name('fan.logout');

        Route::get(
            '/news',
            [FanSiteController::class, 'news']
        )->name('fan.news');

        Route::get(
            '/events',
            [FanSiteController::class, 'events']
        )->name('fan.events');

        Route::get(
            '/merch',
            [FanSiteController::class, 'merch']
        )->name('fan.merch');

        Route::get(
            '/membership',
            [FanSiteController::class, 'membership']
        )->name('fan.membership');

        // Cart requires fan login
        Route::middleware('ensure.fan')
            ->group(function(){
                Route::get(
                    '/cart',
                    [FanSiteController::class,'cart']
                )->name('fan.cart');

                Route::post(
                    '/cart/add',
                    [FanSiteController::class,'addToCart']
                );

                Route::get(
                    '/checkout',
                    [FanSiteController::class,'checkout']
                )->name('fan.checkout');

                Route::post(
                    '/checkout',
                    [FanSiteController::class,'placeOrder']
                )->name('fan.checkout.submit');

                Route::get(
                    '/order/{order}/success',
                    [FanSiteController::class,'orderSuccess']
                )->name('fan.order.success');
            });
    });



// =====================================================
// MAIN EDITOR LOGIN
// =====================================================

Route::domain('127.0.0.1')->group(function () {
    Route::redirect('/', '/login');

    Route::get(
        '/login',
        [AuthEditorController::class,'showLogin']
    )
    ->name('login');

    Route::post(
        '/login',
        [AuthEditorController::class,'handleLogin']
    )
    ->name('login.submit');




    // =====================================================
    // EDITOR
    // =====================================================

    Route::middleware('require.auth')
    ->group(function(){


        Route::get(
            '/editor',
            [AuthEditorController::class,'showEditor']
        )
        ->name('editor');



        Route::post(
            '/editor/save',
            [AuthEditorController::class,'saveEditor']
        )
        ->name('editor.save');



        Route::post(
            '/logout',
            [AuthEditorController::class,'webLogout']
        )
        ->name('logout');


    });



    // =====================================================
    // PLATFORM ADMIN
    // =====================================================

    Route::middleware('require.auth:admin')
    ->group(function(){

        Route::get(
            '/admin',
            [AuthEditorController::class,'showAdmin']
        )
        ->name('admin');

    });
});
