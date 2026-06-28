<?php

namespace App\Http\Controllers;

use App\Services\Payment\PaymentWebhookDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentWebhookController extends Controller
{
    public function __construct(private PaymentWebhookDispatcher $dispatcher) {}

    /**
     * POST /api/webhooks/payment/{provider}
     *
     * Single entry point for all payment provider callbacks.
     * Always returns HTTP 200 — even on verification failure or internal error.
     *
     * Returning non-200 causes providers to retry, which can flood the DB.
     * Failures are logged and can be replayed from provider dashboards.
     */
    public function handle(Request $request, string $provider): JsonResponse
    {
        Log::info("Payment webhook received", [
            'provider'   => $provider,
            'ip'         => $request->ip(),
            'payload_size' => strlen($request->getContent()),
        ]);

        $this->dispatcher->dispatch($request, $provider);

        // Always 200 — see docblock above
        return response()->json(['received' => true]);
    }
}
