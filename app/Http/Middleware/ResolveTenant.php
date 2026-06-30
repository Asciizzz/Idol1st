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
        /*
         * Example:
         *
         * sakura.idol1st.test
         *
         * hostname:
         * sakura.idol1st.test
         *
         * tenant slug:
         * sakura
         */

        $host = $request->getHost();


        /*
         * Remove local development ports/domains if needed
         *
         * sakura.idol1st.test
         * becomes
         * sakura
         */

        $subdomain = explode('.', $host)[0];


        // Reject main domain
        if (
            $subdomain === 'idol1st' ||
            $subdomain === 'www' ||
            $subdomain === 'localhost'
        ) {

            return response()->json([
                'success' => false,
                'message' => 'Tenant subdomain required.',
            ], 400);

        }


        $tenant = Tenant::where('slug', $subdomain)
            ->first();


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


        /*
         * Existing behavior preserved
         */

        $request->macro(
            'tenant',
            fn () => $tenant
        );


        app()->instance(
            Tenant::class,
            $tenant
        );


        return $next($request);
    }
}
