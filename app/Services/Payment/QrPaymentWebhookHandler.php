<?php

namespace App\Services\Payment;

use App\Models\FanSubscription;
use App\Models\MerchOrder;
use App\Models\MerchVariant;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class QrPaymentWebhookHandler
{
    /**
     * Networks supported by this handler.
     * Each has its own signature verification method.
     */
    private const NETWORKS = [
        'promptpay', 'duitnow', 'qris', 'paynow',
        'instapay', 'wechatpay', 'alipay',
    ];

    public function verify(Request $request, string $provider): ?array
    {
        if (! in_array($provider, self::NETWORKS)) return null;

        $verified = match ($provider) {
            'promptpay' => $this->verifyPromptPay($request),
            'duitnow'   => $this->verifyDuitNow($request),
            'qris'      => $this->verifyQris($request),
            'paynow'    => $this->verifyPayNow($request),
            'wechatpay' => $this->verifyWechatPay($request),
            'alipay'    => $this->verifyAlipay($request),
            default     => $this->verifyGeneric($request, $provider),
        };

        if (! $verified) {
            Log::warning("QR webhook ({$provider}): verification failed.");
            return null;
        }

        return $request->json()->all();
    }

    public function handle(array $event, string $provider): void
    {
        // Normalise the event status across providers to SUCCESS or FAILED
        $status = $this->normaliseStatus($event, $provider);

        $transactionId = $this->extractTransactionId($event, $provider);
        if (! $transactionId) return;

        $payment = Payment::where('transfer_network', strtoupper($provider))
            ->where('status', 'PENDING')
            ->where(function ($q) use ($transactionId) {
                $q->where('transaction_id', $transactionId)
                  ->orWhereNull('transaction_id');
            })
            ->first();

        if (! $payment) return;

        if ($status === 'SUCCESS') {
            $payment->update([
                'status'         => 'COMPLETED',
                'transaction_id' => $transactionId,
                'paid_at'        => now(),
            ]);

            if ($payment->order_id) {
                MerchOrder::where('id', $payment->order_id)->update(['status' => 'PAID']);
            }

            if ($payment->subscription_id) {
                FanSubscription::where('id', $payment->subscription_id)->update(['status' => 'ACTIVE']);
            }
        }

        if ($status === 'FAILED' || $status === 'EXPIRED') {
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

    // ── Provider-specific verification ───────────────────────────

    private function verifyPromptPay(Request $request): bool
    {
        // PromptPay (Bank of Thailand) uses HMAC-SHA256
        $secret    = config('services.promptpay.webhook_secret');
        $signature = $request->header('X-Signature');
        if (! $secret || ! $signature) return false;

        $expected = hash_hmac('sha256', $request->getContent(), $secret);
        return hash_equals($expected, $signature);
    }

    private function verifyDuitNow(Request $request): bool
    {
        // DuitNow (PayNet Malaysia) uses HMAC-SHA256
        $secret    = config('services.duitnow.webhook_secret');
        $signature = $request->header('X-Signature');
        if (! $secret || ! $signature) return false;

        $expected = hash_hmac('sha256', $request->getContent(), $secret);
        return hash_equals($expected, $signature);
    }

    private function verifyQris(Request $request): bool
    {
        // QRIS (Indonesia) uses HMAC-SHA512
        $secret    = config('services.qris.webhook_secret');
        $signature = $request->header('X-Signature');
        if (! $secret || ! $signature) return false;

        $expected = hash_hmac('sha512', $request->getContent(), $secret);
        return hash_equals($expected, $signature);
    }

    private function verifyPayNow(Request $request): bool
    {
        // PayNow (Singapore) — verify via HMAC-SHA256
        $secret    = config('services.paynow.webhook_secret');
        $signature = $request->header('X-Paynow-Signature');
        if (! $secret || ! $signature) return false;

        $expected = hash_hmac('sha256', $request->getContent(), $secret);
        return hash_equals($expected, $signature);
    }

    private function verifyWechatPay(Request $request): bool
    {
        // WeChat Pay uses RSA signature verification
        // Simplified here — replace with WechatPay SDK in production
        $signature = $request->header('Wechatpay-Signature');
        $serial    = $request->header('Wechatpay-Serial');
        return ! empty($signature) && ! empty($serial);
    }

    private function verifyAlipay(Request $request): bool
    {
        // Alipay uses RSA2 (SHA256WithRSA) signature verification
        // Simplified here — replace with Alipay SDK in production
        $sign = $request->input('sign');
        return ! empty($sign);
    }

    private function verifyGeneric(Request $request, string $provider): bool
    {
        // Fallback: accept if a signature header is present
        $signature = $request->header('X-Signature')
            ?? $request->header('X-Webhook-Signature');
        return ! empty($signature);
    }

    // ── Status normalisation ─────────────────────────────────────

    private function normaliseStatus(array $event, string $provider): string
    {
        $raw = match ($provider) {
            'promptpay' => $event['status'] ?? '',
            'duitnow'   => $event['transaction_status'] ?? '',
            'qris'      => $event['transaction']['status'] ?? '',
            'paynow'    => $event['paymentStatus'] ?? '',
            'wechatpay' => $event['trade_state'] ?? '',
            'alipay'    => $event['trade_status'] ?? '',
            default     => $event['status'] ?? '',
        };

        return match (strtoupper($raw)) {
            'SUCCESS', 'PAID', 'COMPLETED', 'SETTLEMENT',
            'TRADE_SUCCESS', 'TRADE_FINISHED' => 'SUCCESS',
            'FAILED', 'DECLINED', 'TRADE_CLOSED' => 'FAILED',
            'EXPIRED', 'TIMEOUT'               => 'EXPIRED',
            default                            => 'UNKNOWN',
        };
    }

    private function extractTransactionId(array $event, string $provider): ?string
    {
        return match ($provider) {
            'promptpay' => $event['transaction_ref'] ?? null,
            'duitnow'   => $event['transaction_id'] ?? null,
            'qris'      => $event['transaction']['id'] ?? null,
            'paynow'    => $event['retrievalRef'] ?? null,
            'wechatpay' => $event['transaction_id'] ?? null,
            'alipay'    => $event['trade_no'] ?? null,
            default     => $event['transaction_id'] ?? $event['id'] ?? null,
        };
    }
}
