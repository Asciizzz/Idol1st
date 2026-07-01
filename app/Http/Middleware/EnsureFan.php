<?php

namespace App\Http\Middleware;

use App\Models\Fan;
use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureFan
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('fan')->user();

        if (! $user || ! ($user instanceof Fan)) {

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized. Fan login required.',
                ], 401);
            }

            return redirect()->route('fan.login', [
                'tenant' => $request->tenant()->slug,
            ]);
        }

        // Ensure the fan belongs to the resolved tenant
        $tenant = app(Tenant::class);

        if ($user->tenant_id !== $tenant->id) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. This account does not belong to this tenant.',
            ], 403);
        }

        return $next($request);
    }
}
