<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\TenantAdminLoginRequest;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

use App\Models\User;
use App\Http\Resources\UserResource;

class TenantAdminAuthController extends Controller
{
    /**
     * New login endpoint for tenant admins.
     */
    public function login(TenantAdminLoginRequest $request): JsonResponse
    {
        $tenant = app(Tenant::class);


        $user = User::where('tenant_id', $tenant->id)
            ->where('email', $request->email)
            ->where('is_tenant_admin', true)
            ->first();


        if (! $user || ! Hash::check($request->password, $user->password)) {

            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
            ],401);

        }


        $token = $user
            ->createToken('tenant-admin-token')
            ->plainTextToken;


        return response()->json([

            'success' => true,

            'token' => $token,

            'user' => new UserResource($user),

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
