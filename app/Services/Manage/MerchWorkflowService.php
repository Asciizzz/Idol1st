<?php

namespace App\Services\Manage;

use App\Models\MerchOrder;
use App\Models\MerchProduct;
use App\Models\MerchVariant;
use App\Models\Shipment;
use App\Models\Tenant;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MerchWorkflowService
{
    public function createProduct(Tenant $tenant, array $data, array $variants): MerchProduct
    {
        return DB::transaction(function () use ($tenant, $data, $variants) {
            $product = MerchProduct::create([
                'id'                 => Str::uuid(),
                'tenant_id'          => $tenant->id,
                'category_id'        => $data['category_id'],
                'name'               => $data['name'],
                'description'        => $data['description'],
                'base_price'         => $data['base_price'],
                'currency'           => $data['currency'],
                'is_limited_edition' => $data['is_limited_edition'] ?? false,
                'available_from'     => $data['available_from'] ?? null,
                'available_until'    => $data['available_until'] ?? null,
            ]);

            foreach ($variants as $variant) {
                MerchVariant::create([
                    'id'            => Str::uuid(),
                    'product_id'    => $product->id,
                    'sku'           => $variant['sku'],
                    'attributes'    => $variant['attributes'],
                    'price'         => $variant['price'],
                    'stock_qty'     => $variant['stock_qty'],
                    'available_qty' => $variant['stock_qty'],
                ]);
            }

            $product = $product->load('category', 'variants');

            app(NotificationService::class)->broadcast(
                $tenant,
                'NEW_MERCH',
                "New merch available: {$product->name}",
                $product->id,
                'MerchProduct',
            );

            return $product;
        });
    }

    public function adjustVariantStock(Tenant $tenant, string $variantId, int $stockQty): MerchVariant
    {
        $variant = MerchVariant::whereHas('product', fn ($query) => $query->forTenant($tenant))
            ->findOrFail($variantId);

        $diff = $stockQty - $variant->stock_qty;

        $variant->update([
            'stock_qty'     => $stockQty,
            'available_qty' => max(0, $variant->available_qty + $diff),
        ]);

        return $variant->fresh();
    }

    public function shipOrder(Tenant $tenant, string $orderId, array $payload): MerchOrder
    {
        $order = MerchOrder::forTenant($tenant)->findOrFail($orderId);

        if (! in_array($order->status, ['PAID'])) {
            throw new \RuntimeException('Only PAID orders can be shipped.');
        }

        DB::transaction(function () use ($payload, $order) {
            Shipment::create([
                'id'                 => Str::uuid(),
                'order_id'           => $order->id,
                'tracking_number'    => $payload['tracking_number'],
                'carrier'            => $payload['carrier'],
                'status'             => 'SHIPPED',
                'shipped_at'         => now(),
                'estimated_delivery' => $payload['estimated_delivery'],
            ]);

            $order->update(['status' => 'SHIPPED']);

            foreach ($order->items as $item) {
                MerchVariant::where('sku', $item->sku)
                    ->decrement('stock_qty', $item->quantity);
            }
        });

        return $order->fresh('items', 'payment', 'shipment');
    }
}
