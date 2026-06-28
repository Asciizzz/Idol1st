<?php

namespace App\Http\Controllers\Fan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fan\AddCartItemRequest;
use App\Http\Requests\Fan\CheckoutRequest;
use App\Http\Requests\Fan\UpdateCartItemRequest;
use App\Http\Resources\MerchCartResource;
use App\Http\Resources\MerchOrderResource;
use App\Http\Resources\MerchProductResource;
use App\Models\Fan;
use App\Models\MerchCart;
use App\Models\MerchCartItem;
use App\Models\MerchOrder;
use App\Models\MerchProduct;
use App\Models\Tenant;
use App\Services\CartService;
use App\Services\CheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MerchController extends Controller
{
    public function __construct(
        private CartService $cartService,
        private CheckoutService $checkoutService,
    ) {}

    /**
     * GET /api/merch/products
     */
    public function products(Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $query = MerchProduct::with('category', 'variants')
            ->where('tenant_id', $tenant->id)
            ->where('status', 'ACTIVE');

        // Filter by availability window
        $query->where(function ($q) {
            $q->whereNull('available_from')->orWhere('available_from', '<=', now());
        })->where(function ($q) {
            $q->whereNull('available_until')->orWhere('available_until', '>=', now());
        });

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->boolean('is_limited_edition')) {
            $query->where('is_limited_edition', true);
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
     * GET /api/merch/cart
     */
    public function cart(Request $request): JsonResponse
    {
        $fan    = $request->user('sanctum');
        $tenant = app(Tenant::class);

        $cart = $this->cartService->getOrCreate($fan, $tenant);
        $cart->load('items.product.category', 'items.variant');

        return response()->json([
            'success' => true,
            'data'    => new MerchCartResource($cart),
        ]);
    }

    /**
     * POST /api/merch/cart/items
     */
    public function addItem(AddCartItemRequest $request): JsonResponse
    {
        $fan    = $request->user('sanctum');
        $tenant = app(Tenant::class);

        $cart = $this->cartService->getOrCreate($fan, $tenant);

        try {
            $cart = $this->cartService->addItem(
                $cart,
                $request->product_id,
                $request->variant_id,
                $request->quantity,
            );
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'success' => true,
            'data'    => new MerchCartResource($cart),
        ]);
    }

    /**
     * PATCH /api/merch/cart/items/{itemId}
     */
    public function updateItem(UpdateCartItemRequest $request, string $itemId): JsonResponse
    {
        $fan  = $request->user('sanctum');
        $cart = MerchCart::where('fan_id', $fan->id)->firstOrFail();
        $item = MerchCartItem::where('cart_id', $cart->id)->findOrFail($itemId);

        try {
            $cart = $this->cartService->updateItem($item, $request->quantity);
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'success' => true,
            'data'    => new MerchCartResource($cart),
        ]);
    }

    /**
     * DELETE /api/merch/cart/items/{itemId}
     */
    public function removeItem(Request $request, string $itemId): JsonResponse
    {
        $fan  = $request->user('sanctum');
        $cart = MerchCart::where('fan_id', $fan->id)->firstOrFail();
        $item = MerchCartItem::where('cart_id', $cart->id)->findOrFail($itemId);

        $cart = $this->cartService->removeItem($item);

        return response()->json([
            'success' => true,
            'data'    => new MerchCartResource($cart),
        ]);
    }

    /**
     * POST /api/merch/checkout
     */
    public function checkout(CheckoutRequest $request): JsonResponse
    {
        $fan    = $request->user('sanctum');
        $tenant = app(Tenant::class);
        $cart   = MerchCart::where('fan_id', $fan->id)
            ->where('tenant_id', $tenant->id)
            ->with('items')
            ->firstOrFail();

        try {
            $result = $this->checkoutService->checkout(
                $cart,
                $request->address_id,
                $request->payment_method,
                $request->transfer_network,
            );
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'success'            => true,
            'order'              => new MerchOrderResource($result['order']),
            'bank_transfer'      => $result['bank_transfer'],
            'payment_client_key' => $result['payment_client_key'],
        ], 201);
    }

    /**
     * GET /api/merch/orders
     */
    public function orders(Request $request): JsonResponse
    {
        $fan = $request->user('sanctum');

        $orders = MerchOrder::with('items', 'payment', 'shipment')
            ->where('fan_id', $fan->id)
            ->latest('placed_at')
            ->paginate($request->input('per_page', 20));

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
     * GET /api/merch/orders/{orderId}
     */
    public function showOrder(Request $request, string $orderId): JsonResponse
    {
        $fan   = $request->user('sanctum');
        $order = MerchOrder::where('fan_id', $fan->id)
            ->with('items', 'payment', 'shipment')
            ->findOrFail($orderId);

        return response()->json([
            'success' => true,
            'data'    => new MerchOrderResource($order),
        ]);
    }

    /**
     * POST /api/merch/orders/{orderId}/cancel
     */
    public function cancelOrder(Request $request, string $orderId): JsonResponse
    {
        $fan   = $request->user('sanctum');
        $order = MerchOrder::where('fan_id', $fan->id)->findOrFail($orderId);

        if (! $order->isCancellable()) {
            return response()->json([
                'success' => false,
                'message' => "Orders with status '{$order->status}' cannot be cancelled.",
            ], 422);
        }

        // Restore available_qty for each item
        foreach ($order->items as $item) {
            MerchVariant::where('sku', $item->sku)
                ->increment('available_qty', $item->quantity);
        }

        $order->update(['status' => 'CANCELLED']);

        return response()->json([
            'success' => true,
            'data'    => new MerchOrderResource($order->fresh('items', 'payment', 'shipment')),
        ]);
    }
}
