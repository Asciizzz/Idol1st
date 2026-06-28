<?php

namespace App\Http\Controllers\Fan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fan\RsvpRequest;
use App\Http\Resources\IdolEventResource;
use App\Models\EventRsvp;
use App\Models\Fan;
use App\Models\IdolEvent;
use App\Models\Tenant;
use App\Services\VisibilityGateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EventController extends Controller
{
    public function __construct(private VisibilityGateService $gate) {}

    /**
     * GET /api/events
     *
     * Lists events for the tenant, gated by visibility.
     * Gated events show title/type/date but withhold location and ticket_url
     * so fans can see what's happening without full access.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);
        $fan    = $this->resolveFan($request);

        $query = IdolEvent::where('tenant_id', $tenant->id)
            ->whereIn('status', ['UPCOMING', 'ONGOING'])
            ->orderBy('start_datetime');

        if ($request->filled('type')) {
            $query->where('event_type', $request->type);
        }

        $events = $query->paginate($request->input('per_page', 20));

        // Apply visibility gate — withhold location/ticket_url for gated events
        $events->getCollection()->transform(function (IdolEvent $event) use ($fan) {
            if (! $this->gate->canView($fan, $event->visibility)) {
                $event->location   = null;
                $event->ticket_url = null;
            }
            return $event;
        });

        return response()->json([
            'success' => true,
            'data'    => IdolEventResource::collection($events),
            'meta'    => [
                'current_page' => $events->currentPage(),
                'per_page'     => $events->perPage(),
                'total'        => $events->total(),
                'last_page'    => $events->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/events/{eventId}/rsvp
     *
     * Upsert RSVP — one per fan per event.
     * Returns the updated RSVP counts aggregated in a single query.
     */
    public function rsvp(RsvpRequest $request, string $eventId): JsonResponse
    {
        $tenant = app(Tenant::class);
        $fan    = $this->resolveFan($request);

        $event = IdolEvent::where('tenant_id', $tenant->id)
            ->whereIn('status', ['UPCOMING', 'ONGOING'])
            ->findOrFail($eventId);

        // Check visibility gate before allowing RSVP
        if (! $this->gate->canView($fan, $event->visibility)) {
            return response()->json([
                'success' => false,
                'message' => $this->gate->gateMessage($event->visibility),
            ], 403);
        }

        EventRsvp::updateOrCreate(
            ['event_id' => $event->id, 'fan_id' => $fan->id],
            ['id' => Str::uuid(), 'status' => $request->status]
        );

        return response()->json([
            'success'     => true,
            'status'      => $request->status,
            'rsvp_counts' => $event->fresh()->rsvp_counts,
        ]);
    }

    private function resolveFan(Request $request): ?Fan
    {
        $user = $request->user('sanctum');
        return $user instanceof Fan ? $user : null;
    }
}
