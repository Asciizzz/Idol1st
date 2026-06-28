<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = $request->header('X-Tenant-ID');

        if (! $tenantId) {
            return response()->json([
                'success' => false,
                'message' => 'Missing X-Tenant-ID header.',
            ], 400);
        }

        $tenant = Tenant::find($tenantId);

        if (! $tenant) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant not found.',
            ], 404);
        }

        if ($tenant->isSuspended()) {
            return response()->json([
                'success' => false,
                'message' => 'This tenant account has been suspended.',
            ], 403);
        }

        // Bind the resolved tenant to the request so controllers
        // can access it via $request->tenant()
        $request->macro('tenant', fn () => $tenant);

        // Also bind into the service container for dependency injection
        app()->instance(Tenant::class, $tenant);

        return $next($request);
    }
}
