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

use App\Services\Fan\SubscriptionWorkflowService;

class FanSubscriptionController extends Controller
{
    public function __construct(private SubscriptionWorkflowService $subscriptionWorkflowService)
    {
    }

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
        $tenant = app(Tenant::class);

        try {
            $subscription = $this->subscriptionWorkflowService->subscribe(
                $fan,
                $tenant,
                $request->tier_id,
                $request->input('auto_renew', true)
            );
        } catch (\RuntimeException $exception) {
            $status = $exception->getMessage() === 'Tier not found.' ? 404 : 422;

            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], $status);
        }

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
        $subscription = $this->subscriptionWorkflowService->cancel($fan);

        return response()->json([
            'success' => true,
            'message' => 'Subscription cancelled.',
            'data'    => new FanSubscriptionResource($subscription),
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

        try {
            $subscription = $this->subscriptionWorkflowService->upgrade($fan, $tenant, $request->tier_id);
        } catch (\RuntimeException $exception) {
            $status = $exception->getMessage() === 'Tier not found.' ? 404 : 422;

            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], $status);
        }

        return response()->json([
            'success' => true,
            'data'    => new FanSubscriptionResource($subscription->load('tier.perks')),
        ]);
    }
}
