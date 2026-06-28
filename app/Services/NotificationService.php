<?php

namespace App\Services;

use App\Models\Fan;
use App\Models\FanNotification;
use App\Models\NotificationPreference;
use App\Models\Tenant;
use Illuminate\Support\Str;

class NotificationService
{
    /**
     * Send a notification to a single fan.
     *
     * Respects the fan's per-type per-channel preferences.
     * Silently skips if the fan has disabled this notification type.
     *
     * Usage:
     *   app(NotificationService::class)->notify(
     *       $fan, 'NEW_POST', 'Sakura just posted a new blog!',
     *       $post->id, 'BlogPost'
     *   );
     */
    public function notify(
        Fan $fan,
        string $type,
        string $message,
        ?string $referenceId = null,
        ?string $referenceType = null,
        string $channel = 'IN_APP',
    ): ?FanNotification {
        // Check fan's preference for this type + channel
        $pref = NotificationPreference::where('fan_id', $fan->id)
            ->where('type', $type)
            ->where('channel', $channel)
            ->first();

        // If a preference exists and is disabled, skip
        if ($pref && ! $pref->is_enabled) {
            return null;
        }

        // Default: enabled if no preference record exists
        return FanNotification::create([
            'id'             => Str::uuid(),
            'fan_id'         => $fan->id,
            'type'           => $type,
            'message'        => $message,
            'is_read'        => false,
            'reference_id'   => $referenceId,
            'reference_type' => $referenceType,
            'created_at'     => now(),
        ]);
    }

    /**
     * Broadcast a notification to all fans of a tenant.
     *
     * Chunked to avoid loading all fans into memory at once.
     * Should be dispatched as a queued job for large tenants.
     *
     * Usage:
     *   app(NotificationService::class)->broadcast(
     *       $tenant, 'NEW_POST', 'Sakura posted: ' . $post->title,
     *       $post->id, 'BlogPost'
     *   );
     */
    public function broadcast(
        Tenant $tenant,
        string $type,
        string $message,
        ?string $referenceId = null,
        ?string $referenceType = null,
        string $channel = 'IN_APP',
    ): void {
        Fan::where('tenant_id', $tenant->id)
            ->chunk(200, function ($fans) use ($type, $message, $referenceId, $referenceType, $channel) {
                $now    = now();
                $insert = [];

                foreach ($fans as $fan) {
                    // Check preference — skip if disabled
                    $pref = NotificationPreference::where('fan_id', $fan->id)
                        ->where('type', $type)
                        ->where('channel', $channel)
                        ->first();

                    if ($pref && ! $pref->is_enabled) {
                        continue;
                    }

                    $insert[] = [
                        'id'             => Str::uuid(),
                        'fan_id'         => $fan->id,
                        'type'           => $type,
                        'message'        => $message,
                        'is_read'        => false,
                        'reference_id'   => $referenceId,
                        'reference_type' => $referenceType,
                        'created_at'     => $now,
                    ];
                }

                if (! empty($insert)) {
                    FanNotification::insert($insert);
                }
            });
    }
}
