<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\StoreEventRequest;
use App\Http\Resources\IdolEventResource;
use App\Models\IdolEvent;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EventController extends Controller
{
    /**
     * GET /api/manage/events
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $query = IdolEvent::where('tenant_id', $tenant->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $events = $query->orderBy('start_datetime')
            ->paginate($request->input('per_page', 20));

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
     * POST /api/manage/events
     */
    public function store(StoreEventRequest $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $event = IdolEvent::create([
            'id'             => Str::uuid(),
            'tenant_id'      => $tenant->id,
            'title'          => $request->title,
            'description'    => $request->description,
            'event_type'     => $request->event_type,
            'start_datetime' => $request->start_datetime,
            'end_datetime'   => $request->end_datetime,
            'location'       => $request->location,
            'ticket_url'     => $request->ticket_url,
            'visibility'     => $request->input('visibility', 'PUBLIC'),
            'status'         => 'UPCOMING',
        ]);

        return response()->json([
            'success' => true,
            'data'    => new IdolEventResource($event),
        ], 201);
    }
}
