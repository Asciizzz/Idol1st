# Step 13 — Wire-up Checklist

## 1. Run the migrations
```bash
php artisan migrate
```
Four new migrations will run:
- `2026_06_26_000022_create_merch_products_table`
- `2026_06_26_000023_create_merch_variants_table`
- `2026_06_26_000024_create_merch_carts_table`
- `2026_06_26_000025_create_merch_orders_table` — also creates addresses, payments, shipments

## 2. File placement summary
| File | Destination |
|---|---|
| `migrations/` (all 4) | `database/migrations/` |
| `Models/MerchCategory.php` | `app/Models/` |
| `Models/MerchProduct.php` | `app/Models/` |
| `Models/MerchVariant.php` | `app/Models/` |
| `Models/MerchCart.php` | `app/Models/` |
| `Models/MerchCartItem.php` | `app/Models/` |
| `Models/Address.php` | `app/Models/` |
| `Models/MerchOrder.php` | `app/Models/` |
| `Models/MerchOrderItem.php` | `app/Models/` |
| `Models/Payment.php` | `app/Models/` |
| `Models/Shipment.php` | `app/Models/` |
| `Services/CartService.php` | `app/Services/` |
| `Services/CheckoutService.php` | `app/Services/` |
| `Resources/MerchCategoryResource.php` | `app/Http/Resources/` |
| `Resources/MerchProductResource.php` | `app/Http/Resources/` |
| `Resources/MerchVariantResource.php` | `app/Http/Resources/` |
| `Resources/MerchCartResource.php` | `app/Http/Resources/` |
| `Resources/MerchCartItemResource.php` | `app/Http/Resources/` |
| `Resources/AddressResource.php` | `app/Http/Resources/` |
| `Resources/MerchOrderResource.php` | `app/Http/Resources/` |
| `Resources/MerchOrderItemResource.php` | `app/Http/Resources/` |
| `Resources/PaymentResource.php` | `app/Http/Resources/` |
| `Resources/ShipmentResource.php` | `app/Http/Resources/` |
| `Requests/Manage/StoreMerchProductRequest.php` | `app/Http/Requests/Manage/` |
| `Requests/Manage/UpdateVariantStockRequest.php` | `app/Http/Requests/Manage/` |
| `Requests/Manage/ShipOrderRequest.php` | `app/Http/Requests/Manage/` |
| `Requests/Fan/AddCartItemRequest.php` | `app/Http/Requests/Fan/` |
| `Requests/Fan/UpdateCartItemRequest.php` | `app/Http/Requests/Fan/` |
| `Requests/Fan/CheckoutRequest.php` | `app/Http/Requests/Fan/` |
| `Requests/Fan/StoreAddressRequest.php` | `app/Http/Requests/Fan/` |
| `Controllers/Manage/MerchController.php` | `app/Http/Controllers/Manage/` |
| `Controllers/Fan/MerchController.php` | `app/Http/Controllers/Fan/` |

## 3. Add routes to routes/api.php
```php
use App\Http\Controllers\Manage\MerchController as ManageMerchController;
use App\Http\Controllers\Fan\MerchController as FanMerchController;
 
// ── Tenant admin merch management ─────────────────────────────
Route::middleware(['resolve.tenant', 'auth:sanctum', 'ensure.tenant.admin'])
    ->prefix('manage/merch')
    ->group(function () {
        Route::get('products',                        [ManageMerchController::class, 'index']);
        Route::post('products',                       [ManageMerchController::class, 'store']);
        Route::patch('variants/{variantId}/stock',    [ManageMerchController::class, 'updateStock']);
        Route::get('orders',                          [ManageMerchController::class, 'orders']);
        Route::post('orders/{orderId}/ship',          [ManageMerchController::class, 'ship']);
    });
 
// ── Fan merch — products are public, cart/orders need fan auth ─
Route::middleware('resolve.tenant')->prefix('merch')->group(function () {
 
    Route::get('products', [FanMerchController::class, 'products']);
 
    Route::middleware(['auth:sanctum', 'ensure.fan'])->group(function () {
        Route::get('cart',                        [FanMerchController::class, 'cart']);
        Route::post('cart/items',                 [FanMerchController::class, 'addItem']);
        Route::patch('cart/items/{itemId}',       [FanMerchController::class, 'updateItem']);
        Route::delete('cart/items/{itemId}',      [FanMerchController::class, 'removeItem']);
        Route::post('checkout',                   [FanMerchController::class, 'checkout']);
        Route::get('orders',                      [FanMerchController::class, 'orders']);
        Route::get('orders/{orderId}',            [FanMerchController::class, 'showOrder']);
        Route::post('orders/{orderId}/cancel',    [FanMerchController::class, 'cancelOrder']);
    });
});
```

## 4. Endpoints available after this step
| Method | URI | Middleware | Description |
|---|---|---|---|
| GET    | `/api/manage/merch/products` | tenant admin | List products |
| POST   | `/api/manage/merch/products` | tenant admin | Create product + variants |
| PATCH  | `/api/manage/merch/variants/{id}/stock` | tenant admin | Update stock |
| GET    | `/api/manage/merch/orders` | tenant admin | List all orders |
| POST   | `/api/manage/merch/orders/{id}/ship` | tenant admin | Ship an order |
| GET    | `/api/merch/products` | public | Browse products |
| GET    | `/api/merch/cart` | fan auth | Get cart |
| POST   | `/api/merch/cart/items` | fan auth | Add to cart |
| PATCH  | `/api/merch/cart/items/{id}` | fan auth | Update qty |
| DELETE | `/api/merch/cart/items/{id}` | fan auth | Remove item |
| POST   | `/api/merch/checkout` | fan auth | Checkout |
| GET    | `/api/merch/orders` | fan auth | Order history |
| GET    | `/api/merch/orders/{id}` | fan auth | Order details |
| POST   | `/api/merch/orders/{id}/cancel` | fan auth | Cancel order |

## 5. Test flow
```
# 1. Create a product as tenant admin
POST /api/manage/merch/products
X-Tenant-ID: <uuid>
Authorization: Bearer <tenant-admin-token>
{
    "name": "Sakura Hoodie",
    "base_price": 49.99,
    "currency": "USD",
    "variants": [
        { "sku": "SAKURA-HOOD-M", "price": 49.99, "stock_qty": 20, "attributes": {"size": "M"} },
        { "sku": "SAKURA-HOOD-L", "price": 49.99, "stock_qty": 15, "attributes": {"size": "L"} }
    ]
}

# 2. Browse as fan
GET /api/merch/products
X-Tenant-ID: <uuid>

# 3. Add to cart
POST /api/merch/cart/items
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token>
{ "product_id": "<uuid>", "variant_id": "<uuid>", "quantity": 1 }

# 4. Add an address first (needed for checkout — see Step 16)
# Then checkout:
POST /api/merch/checkout
X-Tenant-ID: <uuid>
Authorization: Bearer <fan-token>
{ "address_id": "<uuid>", "payment_method": "STRIPE" }
```

## 6. Two stock columns explained
- `stock_qty` — physical stock on hand. Decremented when order is SHIPPED.
- `available_qty` — stock available for purchase. Decremented on checkout, restored on order cancel.

This prevents overselling: two fans can't both checkout the last item because `available_qty` is decremented atomically with `lockForUpdate()` inside a DB transaction.

## 7. Order item snapshots
`MerchOrderItem` stores `product_name` and `sku` as plain strings, not FKs.
This means order history stays accurate even if the product is renamed or deleted.

## 8. Payment stubs
`CheckoutService` returns stub values for `payment_client_key` and `bank_transfer`.
These will be replaced with real Stripe/PayPal/QR provider calls in Step 14.
The order and payment records are created correctly regardless — Step 14 only
changes what the checkout response contains.

## 9. Cancellation restores available_qty
When a fan cancels a PENDING or PAID order, `available_qty` is restored for each
variant so the stock becomes purchasable again. `stock_qty` is only decremented
on shipment confirmation (when the item physically leaves the warehouse).
