<?php

namespace App\Services\Payment;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentWebhookDispatcher
{
    public function __construct(
        private StripeWebhookHandler $stripe,
        private PaypalWebhookHandler $paypal,
        private QrPaymentWebhookHandler $qr,
    ) {}

    private const QR_PROVIDERS = [
        'promptpay', 'duitnow', 'qris', 'paynow',
        'instapay', 'wechatpay', 'alipay',
    ];

    /**
     * Route the incoming webhook to the correct handler.
     * Returns true if handled, false if verification failed.
     */
    public function dispatch(Request $request, string $provider): bool
    {
        try {
            return match (true) {
                $provider === 'stripe'                    => $this->handleStripe($request),
                $provider === 'paypal'                    => $this->handlePaypal($request),
                in_array($provider, self::QR_PROVIDERS)  => $this->handleQr($request, $provider),
                default                                   => $this->handleUnknown($provider),
            };
        } catch (\Throwable $e) {
            Log::error("Webhook dispatch error [{$provider}]: {$e->getMessage()}", [
                'exception' => $e,
                'provider'  => $provider,
            ]);
            // Always return true to prevent provider retry storms
            return true;
        }
    }

    private function handleStripe(Request $request): bool
    {
        $event = $this->stripe->verify($request);
        if (! $event) return false;

        $this->stripe->handle($event);
        return true;
    }

    private function handlePaypal(Request $request): bool
    {
        $event = $this->paypal->verify($request);
        if (! $event) return false;

        $this->paypal->handle($event);
        return true;
    }

    private function handleQr(Request $request, string $provider): bool
    {
        $event = $this->qr->verify($request, $provider);
        if (! $event) return false;

        $this->qr->handle($event, $provider);
        return true;
    }

    private function handleUnknown(string $provider): bool
    {
        Log::warning("Webhook received for unknown provider: {$provider}");
        return true; // Still return 200 to avoid retries
    }
}
