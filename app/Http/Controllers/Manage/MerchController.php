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
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\Manage\MerchWorkflowService;

class MerchController extends Controller
{
    public function __construct(private MerchWorkflowService $merchWorkflowService)
    {
    }

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
        $product = $this->merchWorkflowService->createProduct(
            $tenant,
            $request->validated(),
            $request->variants,
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
        $variant = $this->merchWorkflowService->adjustVariantStock(
            $tenant,
            $variantId,
            $request->stock_qty,
        );

        return response()->json([
            'success' => true,
            'data'    => $variant,
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
        try {
            $order = $this->merchWorkflowService->shipOrder(
                $tenant,
                $orderId,
                $request->validated(),
            );
        } catch (\RuntimeException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data'    => new MerchOrderResource($order),
        ]);
    }
}
