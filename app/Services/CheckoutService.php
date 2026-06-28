<?php

namespace App\Services;

use App\Models\Address;
use App\Models\Fan;
use App\Models\MerchCart;
use App\Models\MerchOrder;
use App\Models\MerchOrderItem;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

use Stripe\StripeClient;

class CheckoutService
{
    /**
     * Convert the fan's cart into an order with a pending payment.
     *
     * Returns an array with:
     *   - order: MerchOrder
     *   - bank_transfer: array|null   (for BANK_TRANSFER method)
     *   - payment_client_key: string|null (for Stripe/PayPal)
     *
     * Stock is decremented atomically inside a transaction.
     * If payment creation fails, the transaction rolls back and stock is restored.
     */
    public function checkout(
        MerchCart $cart,
        string $addressId,
        string $paymentMethod,
        ?string $transferNetwork = null
    ): array {
        $address = Address::where('fan_id', $cart->fan_id)
            ->findOrFail($addressId);

        $items = $cart->items()->with('product', 'variant')->get();

        if ($items->isEmpty()) {
            throw new \RuntimeException('Cart is empty.');
        }

        $result = DB::transaction(function () use ($cart, $address, $items, $paymentMethod, $transferNetwork) {
            $total = 0;

            // Decrement available_qty for each variant (with lock for race safety)
            foreach ($items as $item) {
                $variant = $item->variant()->lockForUpdate()->first();

                if (! $variant->hasStock($item->quantity)) {
                    throw new \RuntimeException("'{$item->product->name}' ({$variant->sku}) is out of stock.");
                }

                $variant->decrement('available_qty', $item->quantity);
                $total += $item->unit_price * $item->quantity;
            }

            // Create the order with address snapshot
            $order = MerchOrder::create([
                'id'                   => Str::uuid(),
                'fan_id'               => $cart->fan_id,
                'tenant_id'            => $cart->tenant_id,
                'shipping_address_id'  => $address->id,
                'shipping_street'      => $address->street,
                'shipping_city'        => $address->city,
                'shipping_state'       => $address->state,
                'shipping_country'     => $address->country,
                'shipping_postal_code' => $address->postal_code,
                'total_amount'         => round($total, 2),
                'currency'             => $items->first()->product->currency ?? 'USD',
                'status'               => 'PENDING',
            ]);

            // Snapshot order items — no FKs to products/variants
            foreach ($items as $item) {
                MerchOrderItem::create([
                    'id'           => Str::uuid(),
                    'order_id'     => $order->id,
                    'product_name' => $item->product->name,
                    'sku'          => $item->variant->sku,
                    'quantity'     => $item->quantity,
                    'unit_price'   => $item->unit_price,
                    'subtotal'     => round($item->unit_price * $item->quantity, 2),
                ]);
            }

            // Create pending payment record
            $payment = Payment::create([
                'id'               => Str::uuid(),
                'order_id'         => $order->id,
                'amount'           => $order->total_amount,
                'currency'         => $order->currency,
                'status'           => 'PENDING',
                'method'           => $paymentMethod,
                'transfer_network' => $transferNetwork,
            ]);

            // Clear the cart
            $cart->items()->delete();

            return ['order' => $order->load('items', 'payment'), 'payment' => $payment];
        });

        return [
            'order'              => $result['order'],
            'bank_transfer'      => $this->buildBankTransferDetail($result['payment'], $transferNetwork),
            'payment_client_key' => $this->buildClientKey($result['payment'], $paymentMethod),
        ];
    }

    /**
     * Build the bank transfer QR detail for Asian payment networks.
     * In production, integrate with the actual payment provider SDK here.
     */
    private function buildBankTransferDetail(Payment $payment, ?string $network): ?array
    {
        if ($payment->method !== 'BANK_TRANSFER' || ! $network) return null;

        return [
            'qr_code_url'        => "https://qr.placeholder.com/{$payment->id}",
            'qr_code_payload'    => base64_encode($payment->id),
            'qr_code_expires_at' => now()->addMinutes(15)->toIso8601String(),
            'transfer_network'   => $network,
            'bank_account_name'  => 'Idol1st Payments',
            'timeout_seconds'    => 900,
        ];
    }

    /**
     * Return a Stripe/PayPal client key for frontend payment confirmation.
     * In production, call the Stripe/PayPal SDK here to get the real key.
     */
    private function buildClientKey(Payment $payment, string $method): ?string
    {
        if ($method !== 'STRIPE') return null;

        $stripe = new StripeClient(config('services.stripe.secret'));
        $intent = $stripe->paymentIntents->create([
            'amount'   => (int) ($payment->amount * 100), // in cents
            'currency' => strtolower($payment->currency),
            'metadata' => ['payment_id' => $payment->id],
        ]);

        $payment->update(['transaction_id' => $intent->id]);

        return $intent->client_secret;
    }
}
