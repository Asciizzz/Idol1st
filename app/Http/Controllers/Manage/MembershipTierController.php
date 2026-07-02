<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\StoreMembershipTierRequest;
use App\Http\Resources\MembershipTierResource;
use App\Models\MembershipTier;
use App\Models\TierPerk;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MembershipTierController extends Controller
{
    /**
     * GET /api/manage/membership/tiers
     */
    public function index(): JsonResponse
    {
        $tenant = app(Tenant::class);

        $tiers = MembershipTier::forTenant($tenant)
            ->with('perks')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => MembershipTierResource::collection($tiers),
        ]);
    }

    /**
     * POST /api/manage/membership/tiers
     */
    public function store(StoreMembershipTierRequest $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $tier = DB::transaction(function () use ($request, $tenant) {
            $tier = MembershipTier::create([
                'id'            => Str::uuid(),
                'tenant_id'     => $tenant->id,
                'name'          => $request->name,
                'price'         => $request->price,
                'billing_cycle' => $request->billing_cycle,
                'max_members'   => $request->max_members,
                'is_active'     => $request->input('is_active', true),
            ]);

            foreach ($request->input('perks', []) as $perk) {
                TierPerk::create([
                    'id'          => Str::uuid(),
                    'tier_id'     => $tier->id,
                    'description' => $perk['description'],
                    'perk_type'   => $perk['perk_type'],
                ]);
            }

            return $tier->load('perks');
        });

        return response()->json([
            'success' => true,
            'data'    => new MembershipTierResource($tier),
        ], 201);
    }
}
