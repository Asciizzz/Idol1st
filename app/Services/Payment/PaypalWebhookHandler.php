<?php

namespace App\Services\Payment;

use App\Models\FanSubscription;
use App\Models\MerchOrder;
use App\Models\MerchVariant;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaypalWebhookHandler
{
    /**
     * Verify the PayPal webhook signature via PayPal's verification API.
     * Returns the decoded event body on success, null on failure.
     */
    public function verify(Request $request): ?array
    {
        $webhookId = config('services.paypal.webhook_id');
        $clientId  = config('services.paypal.client_id');
        $secret    = config('services.paypal.secret');
        $baseUrl   = config('services.paypal.sandbox', true)
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';

        if (! $webhookId || ! $clientId || ! $secret) {
            Log::warning('PayPal webhook: missing config.');
            return null;
        }

        // Get an access token
        $tokenResponse = Http::withBasicAuth($clientId, $secret)
            ->asForm()
            ->post("{$baseUrl}/v1/oauth2/token", ['grant_type' => 'client_credentials']);

        if (! $tokenResponse->ok()) {
            Log::warning('PayPal webhook: failed to get access token.');
            return null;
        }

        $accessToken = $tokenResponse->json('access_token');

        // Verify the webhook
        $verifyResponse = Http::withToken($accessToken)
            ->post("{$baseUrl}/v1/notifications/verify-webhook-signature", [
                'auth_algo'         => $request->header('PAYPAL-AUTH-ALGO'),
                'cert_url'          => $request->header('PAYPAL-CERT-URL'),
                'transmission_id'   => $request->header('PAYPAL-TRANSMISSION-ID'),
                'transmission_sig'  => $request->header('PAYPAL-TRANSMISSION-SIG'),
                'transmission_time' => $request->header('PAYPAL-TRANSMISSION-TIME'),
                'webhook_id'        => $webhookId,
                'webhook_event'     => $request->json()->all(),
            ]);

        if (! $verifyResponse->ok() || $verifyResponse->json('verification_status') !== 'SUCCESS') {
            Log::warning('PayPal webhook: verification failed.');
            return null;
        }

        return $request->json()->all();
    }

    public function handle(array $event): void
    {
        match ($event['event_type'] ?? '') {
            'PAYMENT.CAPTURE.COMPLETED' => $this->onSucceeded($event),
            'PAYMENT.CAPTURE.DENIED'    => $this->onFailed($event),
            default                     => null,
        };
    }

    private function onSucceeded(array $event): void
    {
        $transactionId = $event['resource']['id'] ?? null;
        if (! $transactionId) return;

        $payment = Payment::where('transaction_id', $transactionId)
            ->where('method', 'PAYPAL')
            ->where('status', 'PENDING')
            ->first();

        if (! $payment) return;

        $payment->update(['status' => 'COMPLETED', 'paid_at' => now()]);

        if ($payment->order_id) {
            MerchOrder::where('id', $payment->order_id)->update(['status' => 'PAID']);
        }

        if ($payment->subscription_id) {
            FanSubscription::where('id', $payment->subscription_id)->update(['status' => 'ACTIVE']);
        }
    }

    private function onFailed(array $event): void
    {
        $transactionId = $event['resource']['id'] ?? null;
        if (! $transactionId) return;

        $payment = Payment::where('transaction_id', $transactionId)
            ->where('status', 'PENDING')
            ->first();

        if (! $payment) return;

        $payment->update(['status' => 'FAILED']);

        if ($payment->order_id) {
            $order = MerchOrder::with('items')->find($payment->order_id);
            if ($order) {
                foreach ($order->items as $item) {
                    MerchVariant::where('sku', $item->sku)->increment('available_qty', $item->quantity);
                }
                $order->update(['status' => 'CANCELLED']);
            }
        }

        if ($payment->subscription_id) {
            FanSubscription::where('id', $payment->subscription_id)->update(['status' => 'CANCELLED']);
        }
    }
}
