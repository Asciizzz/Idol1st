<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\ServiceAdmin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class RequireAuth
{
    public function handle(Request $request, Closure $next, string $role = null): Response
    {
        if ($role === 'admin' && ! Auth::check()) {
            $serviceAdminToken = $request->session()->get('service_admin_sanctum_token');
            if ($serviceAdminToken) {
                $accessToken = PersonalAccessToken::findToken($serviceAdminToken);
                $tokenable = $accessToken?->tokenable;

                if ($tokenable instanceof ServiceAdmin && $tokenable->is_active) {
                    return $next($request);
                }

                $request->session()->forget('service_admin_sanctum_token');
            }
        }

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
