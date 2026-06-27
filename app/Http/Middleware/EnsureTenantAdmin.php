<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user('sanctum');

        if (! $user || ! ($user instanceof \App\Models\TenantAdmin)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. Tenant admin access required.',
            ], 403);
        }

        // Ensure the admin belongs to the resolved tenant
        $tenant = app(\App\Models\Tenant::class);

        if ($user->tenant_id !== $tenant->id) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. This admin does not belong to this tenant.',
            ], 403);
        }

        return $next($request);
    }
}
