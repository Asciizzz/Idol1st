<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = null;

        // Prefer tenant resolution from bearer token (tokenable->tenant_id)
        // so localhost/IP editor calls do not require custom headers.
        $plainToken = $request->bearerToken();
        if ($plainToken) {
            $accessToken = PersonalAccessToken::findToken($plainToken);
            $tokenable = $accessToken?->tokenable;

            if ($tokenable && isset($tokenable->tenant_id) && $tokenable->tenant_id) {
                $tenant = Tenant::query()->find($tokenable->tenant_id);
            }
        }

        if (! $tenant) {
            $host = $request->getHost();

            /*
            * Example:
            * sakura.idol1st.test
            *
            * becomes:
            * sakura
            */
            $subdomain = explode('.', $host)[0];

            if (
                $subdomain === 'idol1st' ||
                $subdomain === 'www' ||
                $subdomain === 'localhost' ||
                $subdomain === '127'
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tenant context required (subdomain or tenant-linked token).',
                ], 400);
            }

            $tenant = Tenant::where('slug', $subdomain)->first();
        }

        if (! $tenant) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant not found.',
            ], 404);
        }

        if ($tenant->isSuspended()) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant suspended.',
            ], 403);
        }

        $request->macro('tenant', fn () => $tenant);

        app()->instance(Tenant::class, $tenant);

        return $next($request);
    }
}
