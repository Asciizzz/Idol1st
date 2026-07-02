<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\StoreIdolGroupRequest;
use App\Http\Resources\IdolGroupResource;
use App\Models\IdolGroup;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class IdolGroupController extends Controller
{
    /**
     * GET /api/manage/idol/groups
     */
    public function index(): JsonResponse
    {
        $tenant = app(Tenant::class);

        $groups = IdolGroup::with('members.socialLinks')
            ->forTenant($tenant)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => IdolGroupResource::collection($groups),
        ]);
    }

    /**
     * POST /api/manage/idol/groups
     */
    public function store(StoreIdolGroupRequest $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $group = IdolGroup::create([
            'id'         => Str::uuid(),
            'tenant_id'  => $tenant->id,
            'group_name' => $request->group_name,
            'debut_date' => $request->debut_date,
            'agency'     => $request->agency,
            'bio'        => $request->bio,
        ]);

        // Attach members if provided
        if ($request->filled('member_ids')) {
            $group->members()->sync($request->member_ids);
        }

        return response()->json([
            'success' => true,
            'data'    => new IdolGroupResource($group->load('members')),
        ], 201);
    }
}
