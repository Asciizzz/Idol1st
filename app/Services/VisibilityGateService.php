<?php

namespace App\Services;

use App\Models\Fan;
use App\Models\FanSubscription;

class VisibilityGateService
{
    /**
     * Determine whether a fan (or guest) can view content with the given visibility.
     *
     * @param  Fan|null  $fan          Null = unauthenticated guest
     * @param  string    $visibility   PUBLIC | SUBSCRIBERS_ONLY | PAID_ONLY
     */
    public function canView(?Fan $fan, string $visibility): bool
    {
        return match ($visibility) {
            'PUBLIC'           => true,
            'SUBSCRIBERS_ONLY' => $this->hasActiveSubscription($fan),
            'PAID_ONLY'        => $this->hasPaidSubscription($fan),
            default            => false,
        };
    }

    /**
     * Return a 403 message appropriate for the visibility level.
     */
    public function gateMessage(string $visibility): string
    {
        return match ($visibility) {
            'SUBSCRIBERS_ONLY' => 'This content is available to subscribers only.',
            'PAID_ONLY'        => 'This content requires a paid membership tier.',
            default            => 'Access denied.',
        };
    }

    /**
     * Fan has any active subscription (free or paid).
     */
    private function hasActiveSubscription(?Fan $fan): bool
    {
        if (! $fan) return false;

        return FanSubscription::where('fan_id', $fan->id)
            ->where('status', 'ACTIVE')
            ->exists();
    }

    /**
     * Fan has an active subscription with price > 0 (paid tier).
     * Joins through the tier to check the price.
     */
    private function hasPaidSubscription(?Fan $fan): bool
    {
        if (! $fan) return false;

        return FanSubscription::where('fan_id', $fan->id)
            ->where('status', 'ACTIVE')
            ->whereHas('tier', fn ($q) => $q->where('price', '>', 0))
            ->exists();
    }
}
