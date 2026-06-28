<?php

namespace App\Services\Payment;

use App\Models\MerchOrder;
use App\Models\MerchVariant;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StripeWebhookHandler
{
    /**
     * Verify the Stripe-Signature header and return the decoded event.
     * Returns null if verification fails.
     */
    public function verify(Request $request): ?array
    {
        $secret    = config('services.stripe.webhook_secret');
        $signature = $request->header('Stripe-Signature');
        $payload   = $request->getContent();

        if (! $signature || ! $secret) {
            Log::warning('Stripe webhook: missing signature or secret.');
            return null;
        }

        // Parse the Stripe-Signature header
        $parts     = [];
        foreach (explode(',', $signature) as $part) {
            [$k, $v] = explode('=', $part, 2);
            $parts[$k] = $v;
        }

        $timestamp = $parts['t'] ?? null;
        $sig       = $parts['v1'] ?? null;

        if (! $timestamp || ! $sig) return null;

        // Validate timestamp tolerance (5 minutes)
        if (abs(time() - (int) $timestamp) > 300) {
            Log::warning('Stripe webhook: timestamp out of tolerance.');
            return null;
        }

        $expected = hash_hmac('sha256', "{$timestamp}.{$payload}", $secret);

        if (! hash_equals($expected, $sig)) {
            Log::warning('Stripe webhook: signature mismatch.');
            return null;
        }

        return json_decode($payload, true);
    }

    /**
     * Handle a verified Stripe event.
     */
    public function handle(array $event): void
    {
        match ($event['type'] ?? '') {
            'payment_intent.succeeded'       => $this->onSucceeded($event),
            'payment_intent.payment_failed'  => $this->onFailed($event),
            default                          => null, // ignore unhandled events
        };
    }

    private function onSucceeded(array $event): void
    {
        $transactionId = $event['data']['object']['id'] ?? null;
        if (! $transactionId) return;

        $payment = Payment::where('transaction_id', $transactionId)
            ->orWhere('transaction_id', null) // stub payments matched by order
            ->where('method', 'STRIPE')
            ->where('status', 'PENDING')
            ->first();

        if (! $payment) return;

        $payment->update([
            'status'  => 'COMPLETED',
            'paid_at' => now(),
        ]);

        if ($payment->order_id) {
            MerchOrder::where('id', $payment->order_id)
                ->update(['status' => 'PAID']);
        }

        if ($payment->subscription_id) {
            \App\Models\FanSubscription::where('id', $payment->subscription_id)
                ->update(['status' => 'ACTIVE']);
        }
    }

    private function onFailed(array $event): void
    {
        $transactionId = $event['data']['object']['id'] ?? null;
        if (! $transactionId) return;

        $payment = Payment::where('transaction_id', $transactionId)
            ->where('status', 'PENDING')
            ->first();

        if (! $payment) return;

        $payment->update(['status' => 'FAILED']);

        if ($payment->order_id) {
            $order = MerchOrder::with('items')->find($payment->order_id);
            if ($order) {
                // Restore available_qty for each item
                foreach ($order->items as $item) {
                    MerchVariant::where('sku', $item->sku)
                        ->increment('available_qty', $item->quantity);
                }
                $order->update(['status' => 'CANCELLED']);
            }
        }

        if ($payment->subscription_id) {
            \App\Models\FanSubscription::where('id', $payment->subscription_id)
                ->update(['status' => 'CANCELLED']);
        }
    }
}
