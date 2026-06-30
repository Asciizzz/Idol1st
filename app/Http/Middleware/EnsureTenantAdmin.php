<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();


        /*
         * User must be logged in
         * AND must have tenant admin permission
         */
        if (
            ! $user ||
            ! $user->is_tenant_admin
        ) {

            return response()->json([
                'success' => false,
                'message' => 'Forbidden. Tenant admin access required.',
            ], 403);

        }


        /*
         * Make sure user belongs to current subdomain tenant
         *
         * Example:
         *
         * sakura.idol1st.test
         *
         * resolves:
         *
         * tenant_id = xxx
         *
         * User must have same tenant_id
         */

        $tenant = $request->tenant();


        if ($user->tenant_id !== $tenant->id) {

            return response()->json([
                'success' => false,
                'message' => 'Forbidden. User does not belong to this tenant.',
            ],403);

        }


        return $next($request);
    }
}
