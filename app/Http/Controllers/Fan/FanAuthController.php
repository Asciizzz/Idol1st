<?php

namespace App\Http\Controllers\Fan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fan\LoginFanRequest;
use App\Http\Requests\Fan\RegisterFanRequest;
use App\Http\Resources\FanResource;
use App\Models\Fan;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FanAuthController extends Controller
{
    /**
     * POST /api/auth/register
     */
    public function register(RegisterFanRequest $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        // Check uniqueness within this tenant
        $emailTaken = Fan::forTenant($tenant)
            ->where('email', $request->email)
            ->exists();

        if ($emailTaken) {
            throw ValidationException::withMessages([
                'email' => ['This email is already registered.'],
            ]);
        }

        $usernameTaken = Fan::forTenant($tenant)
            ->where('username', $request->username)
            ->exists();

        if ($usernameTaken) {
            throw ValidationException::withMessages([
                'username' => ['This username is already taken.'],
            ]);
        }

        $fan = Fan::create([
            'id'           => Str::uuid(),
            'tenant_id'    => $tenant->id,
            'email'        => $request->email,
            'username'     => $request->username,
            'display_name' => $request->input('display_name', $request->username),
            'password'     => Hash::make($request->password),
        ]);

        $token = $fan->createToken('fan-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token'   => $token,
            'fan'     => new FanResource($fan),
        ], 201);
    }

    /**
     * POST /api/auth/login
     */
    public function login(LoginFanRequest $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $fan = Fan::forTenant($tenant)
            ->where('email', $request->email)
            ->first();

        if (! $fan || ! Hash::check($request->password, $fan->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
            ], 401);
        }

        $token = $fan->createToken('fan-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token'   => $token,
            'fan'     => new FanResource($fan->load('subscription.tier')),
        ]);
    }

    /**
     * POST /api/auth/logout
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
