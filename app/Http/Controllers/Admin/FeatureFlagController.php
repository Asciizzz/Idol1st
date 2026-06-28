<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\FeatureFlagOverrideRequest;
use App\Http\Requests\Admin\StoreFeatureFlagRequest;
use App\Http\Resources\FeatureFlagResource;
use App\Models\AuditLog;
use App\Models\FeatureFlag;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class FeatureFlagController extends Controller
{
    /**
     * GET /api/admin/feature-flags
     */
    public function index(): JsonResponse
    {
        $flags = FeatureFlag::all();

        return response()->json([
            'success' => true,
            'data'    => FeatureFlagResource::collection($flags),
        ]);
    }

    /**
     * POST /api/admin/feature-flags
     */
    public function store(StoreFeatureFlagRequest $request): JsonResponse
    {
        $flag = FeatureFlag::create([
            'id'                  => Str::uuid(),
            'name'                => $request->name,
            'is_globally_enabled' => false,
        ]);

        AuditLog::record('FEATURE_FLAG_CREATED', 'FeatureFlag', $flag->id);

        return response()->json([
            'success' => true,
            'data'    => new FeatureFlagResource($flag),
        ], 201);
    }

    /**
     * PUT /api/admin/feature-flags/{flagId}/tenants/{tenantId}
     *
     * Enable or disable a flag override for a specific tenant.
     */
    public function setTenantOverride(
        FeatureFlagOverrideRequest $request,
        string $flagId,
        string $tenantId
    ): JsonResponse {
        $flag   = FeatureFlag::findOrFail($flagId);
        $tenant = Tenant::findOrFail($tenantId);

        $flag->tenants()->syncWithoutDetaching([
            $tenantId => ['is_enabled' => $request->is_enabled],
        ]);

        AuditLog::record(
            $request->is_enabled ? 'FEATURE_FLAG_ENABLED_FOR_TENANT' : 'FEATURE_FLAG_DISABLED_FOR_TENANT',
            'FeatureFlag',
            $flag->id,
            $tenant->id,
        );

        return response()->json([
            'success' => true,
            'message' => "Flag '{$flag->name}' " . ($request->is_enabled ? 'enabled' : 'disabled') . " for tenant.",
        ]);
    }

    /**
     * POST /api/admin/feature-flags/{flagId}/rollout
     *
     * Enable the flag globally for all tenants.
     */
    public function rollout(string $flagId): JsonResponse
    {
        $flag = FeatureFlag::findOrFail($flagId);
        $flag->update(['is_globally_enabled' => true]);

        AuditLog::record('FEATURE_FLAG_GLOBAL_ROLLOUT', 'FeatureFlag', $flag->id);

        return response()->json([
            'success' => true,
            'message' => "Flag '{$flag->name}' rolled out globally.",
            'data'    => new FeatureFlagResource($flag->fresh()),
        ]);
    }
}
