<?php

namespace App\Http\Controllers\Fan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fan\SubscribeRequest;
use App\Http\Requests\Fan\UpgradeSubscriptionRequest;
use App\Http\Resources\FanSubscriptionResource;
use App\Http\Resources\MembershipTierResource;
use App\Models\Fan;
use App\Models\FanSubscription;
use App\Models\MembershipTier;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FanSubscriptionController extends Controller
{
    /**
     * GET /api/membership/tiers
     *
     * Public — no fan auth required. Lists active tiers for the tenant.
     */
    public function tiers(): JsonResponse
    {
        $tenant = app(Tenant::class);

        $tiers = MembershipTier::with('perks')
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => MembershipTierResource::collection($tiers),
        ]);
    }

    /**
     * POST /api/membership/subscribe
     *
     * Creates a new subscription for the fan.
     * Payment is handled asynchronously via webhooks (Step 14).
     * Subscription starts as ACTIVE — webhook will confirm or cancel.
     */
    public function subscribe(SubscribeRequest $request): JsonResponse
    {
        /** @var Fan $fan */
        $fan  = $request->user('sanctum');
        $tier = MembershipTier::findOrFail($request->tier_id);

        // Validate tier belongs to this tenant
        $tenant = app(Tenant::class);
        if ($tier->tenant_id !== $tenant->id) {
            return response()->json([
                'success' => false,
                'message' => 'Tier not found.',
            ], 404);
        }

        // Check capacity
        if (! $tier->hasCapacity()) {
            return response()->json([
                'success' => false,
                'message' => 'This membership tier is full.',
            ], 422);
        }

        // Check for existing active subscription
        $existing = FanSubscription::where('fan_id', $fan->id)
            ->where('status', 'ACTIVE')
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'You already have an active subscription. Use the upgrade endpoint to change tiers.',
            ], 422);
        }

        $subscription = DB::transaction(function () use ($fan, $tier, $request) {
            return FanSubscription::create([
                'id'         => Str::uuid(),
                'fan_id'     => $fan->id,
                'tier_id'    => $tier->id,
                'status'     => 'ACTIVE', // confirmed by webhook in Step 14
                'auto_renew' => $request->input('auto_renew', true),
            ]);
        });

        return response()->json([
            'success' => true,
            'data'    => new FanSubscriptionResource($subscription->load('tier.perks')),
        ], 201);
    }

    /**
     * GET /api/membership/subscription
     */
    public function show(Request $request): JsonResponse
    {
        /** @var Fan $fan */
        $fan = $request->user('sanctum');

        $subscription = FanSubscription::where('fan_id', $fan->id)
            ->where('status', 'ACTIVE')
            ->with('tier.perks')
            ->latest()
            ->first();

        if (! $subscription) {
            return response()->json([
                'success' => false,
                'message' => 'No active subscription found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => new FanSubscriptionResource($subscription),
        ]);
    }

    /**
     * POST /api/membership/subscription/cancel
     */
    public function cancel(Request $request): JsonResponse
    {
        /** @var Fan $fan */
        $fan = $request->user('sanctum');

        $subscription = FanSubscription::where('fan_id', $fan->id)
            ->where('status', 'ACTIVE')
            ->firstOrFail();

        $subscription->update([
            'status'     => 'CANCELLED',
            'auto_renew' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subscription cancelled.',
            'data'    => new FanSubscriptionResource($subscription->fresh('tier.perks')),
        ]);
    }

    /**
     * POST /api/membership/subscription/upgrade
     *
     * Switches the fan to a different tier.
     * Cancels the current subscription and creates a new one.
     */
    public function upgrade(UpgradeSubscriptionRequest $request): JsonResponse
    {
        /** @var Fan $fan */
        $fan    = $request->user('sanctum');
        $tenant = app(Tenant::class);

        $newTier = MembershipTier::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->findOrFail($request->tier_id);

        if (! $newTier->hasCapacity()) {
            return response()->json([
                'success' => false,
                'message' => 'This membership tier is full.',
            ], 422);
        }

        $subscription = DB::transaction(function () use ($fan, $newTier) {
            // Cancel current subscription
            FanSubscription::where('fan_id', $fan->id)
                ->where('status', 'ACTIVE')
                ->update(['status' => 'CANCELLED']);

            // Create new subscription on upgraded tier
            return FanSubscription::create([
                'id'         => Str::uuid(),
                'fan_id'     => $fan->id,
                'tier_id'    => $newTier->id,
                'status'     => 'ACTIVE',
                'auto_renew' => true,
            ]);
        });

        return response()->json([
            'success' => true,
            'data'    => new FanSubscriptionResource($subscription->load('tier.perks')),
        ]);
    }
}
