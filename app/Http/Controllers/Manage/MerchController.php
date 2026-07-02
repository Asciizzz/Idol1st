<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\ShipOrderRequest;
use App\Http\Requests\Manage\StoreMerchProductRequest;
use App\Http\Requests\Manage\UpdateVariantStockRequest;
use App\Http\Resources\MerchOrderResource;
use App\Http\Resources\MerchProductResource;
use App\Models\MerchOrder;
use App\Models\MerchProduct;
use App\Models\MerchVariant;
use App\Models\Shipment;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

use App\Services\NotificationService;

class MerchController extends Controller
{
    /**
     * GET /api/manage/merch/products
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $query = MerchProduct::forTenant($tenant)
            ->with('category', 'variants');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $products = $query->latest()->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data'    => MerchProductResource::collection($products),
            'meta'    => [
                'current_page' => $products->currentPage(),
                'per_page'     => $products->perPage(),
                'total'        => $products->total(),
                'last_page'    => $products->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/manage/merch/products
     */
    public function store(StoreMerchProductRequest $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $product = DB::transaction(function () use ($request, $tenant) {
            $product = MerchProduct::create([
                'id'                 => Str::uuid(),
                'tenant_id'          => $tenant->id,
                'category_id'        => $request->category_id,
                'name'               => $request->name,
                'description'        => $request->description,
                'base_price'         => $request->base_price,
                'currency'           => $request->currency,
                'is_limited_edition' => $request->input('is_limited_edition', false),
                'available_from'     => $request->available_from,
                'available_until'    => $request->available_until,
            ]);

            foreach ($request->variants as $v) {
                MerchVariant::create([
                    'id'            => Str::uuid(),
                    'product_id'    => $product->id,
                    'sku'           => $v['sku'],
                    'attributes'    => $v['attributes'],
                    'price'         => $v['price'],
                    'stock_qty'     => $v['stock_qty'],
                    'available_qty' => $v['stock_qty'], // available starts equal to stock
                ]);
            }

            return $product->load('category', 'variants');
        });

        app(NotificationService::class)->broadcast(
            $tenant,
            'NEW_MERCH',
            "New merch available: {$product->name}",
            $product->id,
            'MerchProduct',
        );

        return response()->json([
            'success' => true,
            'data'    => new MerchProductResource($product),
        ], 201);
    }

    /**
     * PATCH /api/manage/merch/variants/{variantId}/stock
     */
    public function updateStock(UpdateVariantStockRequest $request, string $variantId): JsonResponse
    {
        $tenant  = app(Tenant::class);
        $variant = MerchVariant::whereHas('product', fn ($q) => $q->forTenant($tenant))
            ->findOrFail($variantId);

        $diff = $request->stock_qty - $variant->stock_qty;

        $variant->update([
            'stock_qty'     => $request->stock_qty,
            'available_qty' => max(0, $variant->available_qty + $diff),
        ]);

        return response()->json([
            'success' => true,
            'data'    => $variant->fresh(),
        ]);
    }

    /**
     * GET /api/manage/merch/orders
     */
    public function orders(Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $query = MerchOrder::forTenant($tenant)
            ->with('items', 'payment', 'shipment');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $orders = $query->latest('placed_at')->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data'    => MerchOrderResource::collection($orders),
            'meta'    => [
                'current_page' => $orders->currentPage(),
                'per_page'     => $orders->perPage(),
                'total'        => $orders->total(),
                'last_page'    => $orders->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/manage/merch/orders/{orderId}/ship
     */
    public function ship(ShipOrderRequest $request, string $orderId): JsonResponse
    {
        $tenant = app(Tenant::class);
        $order  = MerchOrder::forTenant($tenant)->findOrFail($orderId);

        if (! in_array($order->status, ['PAID'])) {
            return response()->json([
                'success' => false,
                'message' => 'Only PAID orders can be shipped.',
            ], 422);
        }

        DB::transaction(function () use ($request, $order) {
            Shipment::create([
                'id'                 => Str::uuid(),
                'order_id'           => $order->id,
                'tracking_number'    => $request->tracking_number,
                'carrier'            => $request->carrier,
                'status'             => 'SHIPPED',
                'shipped_at'         => now(),
                'estimated_delivery' => $request->estimated_delivery,
            ]);

            $order->update(['status' => 'SHIPPED']);

            // Also confirm stock deduction on shipment
            foreach ($order->items as $item) {
                MerchVariant::where('sku', $item->sku)
                    ->decrement('stock_qty', $item->quantity);
            }
        });

        return response()->json([
            'success' => true,
            'data'    => new MerchOrderResource($order->fresh('items', 'payment', 'shipment')),
        ]);
    }
}
