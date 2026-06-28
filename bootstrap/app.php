<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'require.auth'         => \App\Http\Middleware\RequireAuth::class,
            'ensure.admin'         => \App\Http\Middleware\EnsureAdmin::class,
            'resolve.tenant'       => \App\Http\Middleware\ResolveTenant::class,
            'ensure.service.admin' => \App\Http\Middleware\EnsureServiceAdmin::class,
            'ensure.tenant.admin'  => \App\Http\Middleware\EnsureTenantAdmin::class,
            'ensure.fan'           => \App\Http\Middleware\EnsureFan::class, // add this
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {})
    ->create();
