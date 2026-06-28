<?php

namespace App\Http\Controllers\Fan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fan\UpdateNotificationPreferencesRequest;
use App\Http\Resources\FanNotificationResource;
use App\Http\Resources\NotificationPreferenceResource;
use App\Models\Fan;
use App\Models\FanNotification;
use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications
     *
     * Returns paginated notifications for the authenticated fan.
     * Includes total unread_count in the response envelope.
     * Supports ?unread_only=true to filter to unread only.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var Fan $fan */
        $fan = $request->user('sanctum');

        $query = FanNotification::where('fan_id', $fan->id)
            ->orderByDesc('created_at');

        if ($request->boolean('unread_only')) {
            $query->where('is_read', false);
        }

        $notifications = $query->paginate($request->input('per_page', 20));

        $unreadCount = FanNotification::where('fan_id', $fan->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success'      => true,
            'data'         => FanNotificationResource::collection($notifications),
            'unread_count' => $unreadCount,
            'meta'         => [
                'current_page' => $notifications->currentPage(),
                'per_page'     => $notifications->perPage(),
                'total'        => $notifications->total(),
                'last_page'    => $notifications->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/notifications/read-all
     *
     * Marks all unread notifications as read using a single bulk UPDATE.
     * Does not load records into memory.
     */
    public function readAll(Request $request): JsonResponse
    {
        /** @var Fan $fan */
        $fan = $request->user('sanctum');

        $updated = FanNotification::where('fan_id', $fan->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'success'         => true,
            'marked_as_read'  => $updated,
        ]);
    }

    /**
     * GET /api/notifications/preferences
     *
     * Returns the fan's notification preferences.
     * Types with no preference record default to enabled.
     */
    public function preferences(Request $request): JsonResponse
    {
        /** @var Fan $fan */
        $fan = $request->user('sanctum');

        $preferences = NotificationPreference::where('fan_id', $fan->id)
            ->orderBy('type')
            ->orderBy('channel')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => NotificationPreferenceResource::collection($preferences),
        ]);
    }

    /**
     * PUT /api/notifications/preferences
     *
     * Bulk upsert notification preferences.
     * Accepts an array of { type, is_enabled, channel } objects.
     *
     * Uses upsert() on [fan_id, type, channel] for efficiency —
     * avoids N individual queries for N preference rows.
     */
    public function updatePreferences(UpdateNotificationPreferencesRequest $request): JsonResponse
    {
        /** @var Fan $fan */
        $fan  = $request->user('sanctum');
        $rows = collect($request->validated())->map(fn ($pref) => [
            'fan_id'     => $fan->id,
            'type'       => $pref['type'],
            'is_enabled' => $pref['is_enabled'],
            'channel'    => $pref['channel'],
        ])->all();

        NotificationPreference::upsert(
            $rows,
            ['fan_id', 'type', 'channel'],  // unique keys
            ['is_enabled']                   // columns to update on conflict
        );

        $updated = NotificationPreference::where('fan_id', $fan->id)
            ->orderBy('type')
            ->orderBy('channel')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => NotificationPreferenceResource::collection($updated),
        ]);
    }
}
