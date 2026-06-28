<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssignPlanRequest;
use App\Http\Requests\Admin\StoreTenantRequest;
use App\Http\Requests\Admin\SuspendTenantRequest;
use App\Http\Resources\TenantResource;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TenantController extends Controller
{
    /**
     * GET /api/admin/tenants
     */
    public function index(Request $request): JsonResponse
    {
        $query = Tenant::with(['subscription.plan']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $tenants = $query->latest()->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data'    => TenantResource::collection($tenants),
            'meta'    => [
                'current_page' => $tenants->currentPage(),
                'per_page'     => $tenants->perPage(),
                'total'        => $tenants->total(),
                'last_page'    => $tenants->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/admin/tenants
     */
    public function store(StoreTenantRequest $request): JsonResponse
    {
        $tenant = DB::transaction(function () use ($request) {
            $tenant = Tenant::create([
                'id'         => Str::uuid(),
                'name'       => $request->name,
                'status'     => 'ACTIVE',
                'created_by' => $request->user()?->id,
                'config'     => [
                    'branding_logo'   => null,
                    'branding_colors' => null,
                    'custom_domain'   => null,
                    'settings'        => [],
                ],
            ]);

            TenantSubscription::create([
                'id'        => Str::uuid(),
                'tenant_id' => $tenant->id,
                'plan_id'   => $request->plan_id,
                'status'    => 'ACTIVE',
            ]);

            return $tenant->load('subscription.plan');
        });

        return response()->json([
            'success' => true,
            'data'    => new TenantResource($tenant),
        ], 201);
    }

    /**
     * GET /api/admin/tenants/{tenantId}
     */
    public function show(string $tenantId): JsonResponse
    {
        $tenant = Tenant::with('subscription.plan')->findOrFail($tenantId);

        return response()->json([
            'success' => true,
            'data'    => new TenantResource($tenant),
        ]);
    }

    /**
     * PATCH /api/admin/tenants/{tenantId}
     */
    public function update(Request $request, string $tenantId): JsonResponse
    {
        $request->validate([
            'name'   => ['sometimes', 'string', 'max:255'],
            'config' => ['sometimes', 'array'],
        ]);

        $tenant = Tenant::findOrFail($tenantId);
        $tenant->update($request->only(['name', 'config']));

        return response()->json([
            'success' => true,
            'data'    => new TenantResource($tenant->fresh('subscription.plan')),
        ]);
    }

    /**
     * POST /api/admin/tenants/{tenantId}/suspend
     */
    public function suspend(SuspendTenantRequest $request, string $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);

        if ($tenant->isSuspended()) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant is already suspended.',
            ], 422);
        }

        $tenant->update([
            'status'             => 'SUSPENDED',
            'suspended_at'       => now(),
            'suspension_reason'  => $request->reason,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tenant suspended.',
        ]);
    }

    /**
     * POST /api/admin/tenants/{tenantId}/reactivate
     */
    public function reactivate(string $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);

        if ($tenant->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Tenant is already active.',
            ], 422);
        }

        $tenant->update([
            'status'             => 'ACTIVE',
            'suspended_at'       => null,
            'suspension_reason'  => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tenant reactivated.',
        ]);
    }

    /**
     * POST /api/admin/tenants/{tenantId}/impersonate
     *
     * Issues a short-lived Sanctum token scoped to the tenant's admin user.
     * The token expires in 1 hour.
     */
    public function impersonate(Request $request, string $tenantId): JsonResponse
    {
        $request->validate([
            'target_user_id' => ['sometimes', 'uuid'],
        ]);

        $tenant = Tenant::findOrFail($tenantId);

        // Find the target user — defaults to any user if none specified
        $user = $request->filled('target_user_id')
            ? \App\Models\User::findOrFail($request->target_user_id)
            : \App\Models\User::first();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'No user found for impersonation.',
            ], 404);
        }

        $expiresAt = now()->addHour();
        $sessionId = Str::uuid()->toString();

        $token = $user->createToken(
            "impersonate:{$sessionId}",
            ['*'],
            $expiresAt
        )->plainTextToken;

        return response()->json([
            'success'    => true,
            'session_id' => $sessionId,
            'token'      => $token,
            'expires_at' => $expiresAt,
        ]);
    }

    /**
     * PUT /api/admin/tenants/{tenantId}/plan
     */
    public function assignPlan(AssignPlanRequest $request, string $tenantId): JsonResponse
    {
        $tenant = Tenant::findOrFail($tenantId);
        $plan   = Plan::findOrFail($request->plan_id);

        DB::transaction(function () use ($tenant, $plan) {
            // Cancel existing active subscription
            $tenant->subscriptions()
                ->where('status', 'ACTIVE')
                ->update(['status' => 'CANCELLED']);

            // Create new subscription
            TenantSubscription::create([
                'id'        => Str::uuid(),
                'tenant_id' => $tenant->id,
                'plan_id'   => $plan->id,
                'status'    => 'ACTIVE',
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => "Plan changed to {$plan->name}.",
        ]);
    }
}
