<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePlanRequest;
use App\Http\Resources\PlanResource;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class PlanController extends Controller
{
    /**
     * GET /api/admin/plans
     */
    public function index(): JsonResponse
    {
        $plans = Plan::all();

        return response()->json([
            'success' => true,
            'data'    => PlanResource::collection($plans),
        ]);
    }

    /**
     * POST /api/admin/plans
     */
    public function store(StorePlanRequest $request): JsonResponse
    {
        $plan = Plan::create([
            'id'            => Str::uuid(),
            'name'          => $request->name,
            'price'         => $request->price,
            'billing_cycle' => $request->billing_cycle,
            'is_active'     => $request->input('is_active', true),
        ]);

        return response()->json([
            'success' => true,
            'data'    => new PlanResource($plan),
        ], 201);
    }
}
