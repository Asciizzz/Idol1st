<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\TenantAdminLoginRequest;
use App\Http\Resources\TenantAdminResource;
use App\Models\Tenant;
use App\Models\TenantAdmin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class TenantAdminAuthController extends Controller
{
    /**
     * POST /api/manage/auth/login
     *
     * Tenant-scoped login — credentials are validated against
     * the tenant_admins table filtered by the resolved tenant.
     */
    public function login(TenantAdminLoginRequest $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $admin = TenantAdmin::where('tenant_id', $tenant->id)
            ->where('email', $request->email)
            ->first();

        if (! $admin || ! Hash::check($request->password, $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
            ], 401);
        }

        $token = $admin->createToken('tenant-admin-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token'   => $token,
            'admin'   => new TenantAdminResource($admin),
        ]);
    }

    /**
     * POST /api/manage/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user('sanctum')?->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out.',
        ]);
    }
}
