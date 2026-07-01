<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\MfaVerifyRequest;
use App\Http\Requests\Admin\PlatformLoginRequest;
use App\Http\Resources\ServiceAdminResource;
use App\Models\AuditLog;
use App\Models\ServiceAdmin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class PlatformAdminAuthController extends Controller
{
    /**
     * POST /api/admin/auth/login
     *
     * Validates credentials and returns a token.
     * If MFA is enabled, token is returned but mfa_required = true —
     * the client must verify the TOTP code before proceeding.
     */
    public function login(PlatformLoginRequest $request): JsonResponse
    {
        $admin = ServiceAdmin::where('email', $request->email)->first();

        if (! $admin || ! Hash::check($request->password, $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
            ], 401);
        }

        if (! $admin->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'This account has been deactivated.',
            ], 403);
        }

        $admin->update(['last_login_at' => now()]);

        $token = $admin->createToken('platform-admin-token')->plainTextToken;

        if ($request->hasSession()) {
            $request->session()->put('service_admin_sanctum_token', $token);
        }

        AuditLog::record('ADMIN_LOGIN', 'ServiceAdmin', $admin->id, null, $admin->id);

        return response()->json([
            'success'      => true,
            'token'        => $token,
            'mfa_required' => $admin->mfa_enabled,
            'admin'        => new ServiceAdminResource($admin),
        ]);
    }

    /**
     * POST /api/admin/auth/mfa/verify
     *
     * Verifies a TOTP code against the admin's MFA secret.
     * Requires the pragmarx/google2fa package — see checklist.
     */
    public function verifyMfa(MfaVerifyRequest $request): JsonResponse
    {
        $admin = $request->user('sanctum');

        if (! $admin instanceof ServiceAdmin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        if (! $admin->mfa_enabled || ! $admin->mfa_secret) {
            return response()->json([
                'success' => false,
                'message' => 'MFA is not enabled for this account.',
            ], 422);
        }

        $google2fa = app(\PragmaRX\Google2FA\Google2FA::class);
        $valid     = $google2fa->verifyKey($admin->mfa_secret, $request->token);

        if (! $valid) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid MFA token.',
            ], 422);
        }

        AuditLog::record('ADMIN_MFA_VERIFIED', 'ServiceAdmin', $admin->id, null, $admin->id);

        return response()->json([
            'success' => true,
            'message' => 'MFA verified.',
        ]);
    }

    /**
     * POST /api/admin/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $admin = $request->user('sanctum');

        AuditLog::record('ADMIN_LOGOUT', 'ServiceAdmin', $admin?->id, null, $admin?->id);

        $request->user('sanctum')?->currentAccessToken()->delete();

        if ($request->hasSession()) {
            $request->session()->forget('service_admin_sanctum_token');
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out.',
        ]);
    }
}
