<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureServiceAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! ($user instanceof \App\Models\ServiceAdmin)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. Service admin access required.',
            ], 403);
        }

        if (! $user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'This admin account has been deactivated.',
            ], 403);
        }

        return $next($request);
    }
}
