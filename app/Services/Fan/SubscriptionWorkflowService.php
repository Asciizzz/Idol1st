<?php

namespace App\Services\Fan;

use App\Models\Fan;
use App\Models\FanSubscription;
use App\Models\MembershipTier;
use App\Models\Tenant;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SubscriptionWorkflowService
{
    public function subscribe(Fan $fan, Tenant $tenant, string $tierId, bool $autoRenew = true): FanSubscription
    {
        $tier = MembershipTier::findOrFail($tierId);

        if ($tier->tenant_id !== $tenant->id) {
            throw new \RuntimeException('Tier not found.');
        }

        if (! $tier->hasCapacity()) {
            throw new \RuntimeException('This membership tier is full.');
        }

        if ($this->hasActiveSubscription($fan)) {
            throw new \RuntimeException('You already have an active subscription. Use the upgrade endpoint to change tiers.');
        }

        return DB::transaction(function () use ($fan, $tier, $autoRenew) {
            return FanSubscription::create([
                'id'         => Str::uuid(),
                'fan_id'     => $fan->id,
                'tier_id'    => $tier->id,
                'status'     => 'ACTIVE',
                'auto_renew' => $autoRenew,
            ]);
        });
    }

    public function cancel(Fan $fan): FanSubscription
    {
        $subscription = FanSubscription::where('fan_id', $fan->id)
            ->where('status', 'ACTIVE')
            ->firstOrFail();

        $subscription->update([
            'status'     => 'CANCELLED',
            'auto_renew' => false,
        ]);

        app(NotificationService::class)->notify(
            $fan,
            'SUBSCRIPTION_EXPIRY',
            'Your membership has been cancelled.',
            $subscription->id,
            'FanSubscription',
        );

        return $subscription->fresh('tier.perks');
    }

    public function upgrade(Fan $fan, Tenant $tenant, string $tierId): FanSubscription
    {
        $tier = MembershipTier::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->findOrFail($tierId);

        if (! $tier->hasCapacity()) {
            throw new \RuntimeException('This membership tier is full.');
        }

        return DB::transaction(function () use ($fan, $tier) {
            FanSubscription::where('fan_id', $fan->id)
                ->where('status', 'ACTIVE')
                ->update(['status' => 'CANCELLED']);

            return FanSubscription::create([
                'id'         => Str::uuid(),
                'fan_id'     => $fan->id,
                'tier_id'    => $tier->id,
                'status'     => 'ACTIVE',
                'auto_renew' => true,
            ]);
        });
    }

    private function hasActiveSubscription(Fan $fan): bool
    {
        return FanSubscription::where('fan_id', $fan->id)
            ->where('status', 'ACTIVE')
            ->exists();
    }
}
