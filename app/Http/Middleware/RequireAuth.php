<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RequireAuth
{
    public function handle(Request $request, Closure $next, string $role = null): Response
    {
        if (! Auth::check()) {
            return redirect()->route('login');
        }

        // Optional role gate — pass role as middleware parameter e.g. 'require.auth:admin'
        if ($role && Auth::user()->role !== $role) {
            abort(403, 'Unauthorized.');
        }

        return $next($request);
    }
}
