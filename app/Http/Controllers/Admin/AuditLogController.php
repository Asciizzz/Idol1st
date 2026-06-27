<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * GET /api/admin/audit-logs
     *
     * Paginated audit log query with filters:
     *   ?tenant_id=uuid
     *   ?action=TENANT_SUSPENDED
     *   ?from=2026-01-01
     *   ?until=2026-06-30
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::orderByDesc('performed_at');

        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->tenant_id);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('from')) {
            $query->whereDate('performed_at', '>=', $request->from);
        }

        if ($request->filled('until')) {
            $query->whereDate('performed_at', '<=', $request->until);
        }

        $logs = $query->paginate($request->input('per_page', 50));

        return response()->json([
            'success' => true,
            'data'    => AuditLogResource::collection($logs),
            'meta'    => [
                'current_page' => $logs->currentPage(),
                'per_page'     => $logs->perPage(),
                'total'        => $logs->total(),
                'last_page'    => $logs->lastPage(),
            ],
        ]);
    }
}
