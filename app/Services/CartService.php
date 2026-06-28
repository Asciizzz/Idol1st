<?php

namespace App\Services;

use App\Models\Fan;
use App\Models\MerchCart;
use App\Models\MerchCartItem;
use App\Models\MerchProduct;
use App\Models\MerchVariant;
use App\Models\Tenant;
use Illuminate\Support\Str;

class CartService
{
    /**
     * Get or create the fan's cart for the current tenant.
     */
    public function getOrCreate(Fan $fan, Tenant $tenant): MerchCart
    {
        return MerchCart::firstOrCreate(
            ['fan_id' => $fan->id, 'tenant_id' => $tenant->id],
            ['id' => Str::uuid()]
        );
    }

    /**
     * Add an item to the cart.
     * If the same variant already exists, increment quantity instead.
     */
    public function addItem(
        MerchCart $cart,
        string $productId,
        string $variantId,
        int $qty
    ): MerchCart {
        $variant = MerchVariant::findOrFail($variantId);
        $product = MerchProduct::findOrFail($productId);

        if (! $variant->hasStock($qty)) {
            throw new \RuntimeException("Insufficient stock for SKU {$variant->sku}.");
        }

        $existing = MerchCartItem::where('cart_id', $cart->id)
            ->where('variant_id', $variantId)
            ->first();

        if ($existing) {
            $newQty = $existing->quantity + $qty;
            if (! $variant->hasStock($newQty)) {
                throw new \RuntimeException("Insufficient stock for SKU {$variant->sku}.");
            }
            $existing->update(['quantity' => $newQty]);
        } else {
            MerchCartItem::create([
                'id'         => Str::uuid(),
                'cart_id'    => $cart->id,
                'product_id' => $product->id,
                'variant_id' => $variant->id,
                'quantity'   => $qty,
                'unit_price' => $variant->price,
            ]);
        }

        return $cart->fresh('items.product.category', 'items.variant');
    }

    /**
     * Update an existing cart item's quantity.
     */
    public function updateItem(MerchCartItem $item, int $qty): MerchCart
    {
        $variant = $item->variant;

        if (! $variant->hasStock($qty)) {
            throw new \RuntimeException("Insufficient stock for SKU {$variant->sku}.");
        }

        $item->update(['quantity' => $qty]);

        return $item->cart->fresh('items.product.category', 'items.variant');
    }

    /**
     * Remove an item from the cart.
     */
    public function removeItem(MerchCartItem $item): MerchCart
    {
        $cart = $item->cart;
        $item->delete();

        return $cart->fresh('items.product.category', 'items.variant');
    }
}
