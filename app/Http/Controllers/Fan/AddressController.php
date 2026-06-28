<?php

namespace App\Http\Controllers\Fan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fan\StoreAddressRequest;
use App\Http\Resources\AddressResource;
use App\Models\Address;
use App\Models\Fan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AddressController extends Controller
{
    /**
     * GET /api/profile/addresses
     *
     * List all saved addresses for the fan, default address first.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var Fan $fan */
        $fan = $request->user('sanctum');

        $addresses = Address::where('fan_id', $fan->id)
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => AddressResource::collection($addresses),
        ]);
    }

    /**
     * POST /api/profile/addresses
     *
     * Add a new address. If is_default is true, unsets any existing default first.
     * Both operations are wrapped in a transaction to prevent split state.
     */
    public function store(StoreAddressRequest $request): JsonResponse
    {
        /** @var Fan $fan */
        $fan = $request->user('sanctum');

        $isDefault = $request->boolean('is_default', false);

        // If this is the fan's first address, make it default automatically
        $hasAddresses = Address::where('fan_id', $fan->id)->exists();
        if (! $hasAddresses) {
            $isDefault = true;
        }

        $address = DB::transaction(function () use ($request, $fan, $isDefault) {
            // Unset existing default before setting the new one
            if ($isDefault) {
                Address::where('fan_id', $fan->id)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }

            return Address::create([
                'id'          => Str::uuid(),
                'fan_id'      => $fan->id,
                'street'      => $request->street,
                'city'        => $request->city,
                'state'       => $request->state,
                'country'     => $request->country,
                'postal_code' => $request->postal_code,
                'is_default'  => $isDefault,
            ]);
        });

        return response()->json([
            'success' => true,
            'data'    => new AddressResource($address),
        ], 201);
    }
}
