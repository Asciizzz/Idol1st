# Step 14 — Wire-up Checklist

## 1. No new migrations
Step 14 reuses `payments`, `merch_orders`, `fan_subscriptions`, and `merch_variants`
from Steps 12 and 13.

## 2. File placement summary
| File | Destination |
|---|---|
| `Services/Payment/StripeWebhookHandler.php` | `app/Services/Payment/` |
| `Services/Payment/PaypalWebhookHandler.php` | `app/Services/Payment/` |
| `Services/Payment/QrPaymentWebhookHandler.php` | `app/Services/Payment/` |
| `Services/Payment/PaymentWebhookDispatcher.php` | `app/Services/Payment/` |
| `Controllers/PaymentWebhookController.php` | `app/Http/Controllers/` |

Note: create `app/Services/Payment/` directory if it doesn't exist.

## 3. Add routes to routes/api.php
```php
use App\Http\Controllers\PaymentWebhookController;
 
// Webhook routes are public — payment providers call these directly.
// No auth middleware, no CSRF (excluded separately — see checklist).
Route::post(
    'webhooks/payment/{provider}',
    [PaymentWebhookController::class, 'handle']
)->whereIn('provider', [
    'stripe', 'paypal', 'promptpay', 'duitnow',
    'qris', 'paynow', 'instapay', 'wechatpay', 'alipay',
]);
```

## 4. Exclude webhook routes from CSRF verification
Webhook endpoints must not be CSRF-verified since providers don't send CSRF tokens.

In `bootstrap/app.php`:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->validateCsrfTokens(except: [
        'api/webhooks/*',
    ]);
})
```

If you're using the API routes (which already bypass CSRF by default in Laravel),
this may already be handled — verify by checking if `routes/api.php` uses the
`api` middleware group.

## 5. Add provider credentials to config/services.php
```php
'stripe' => [
    'key'            => env('STRIPE_KEY'),
    'secret'         => env('STRIPE_SECRET'),
    'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
],

'paypal' => [
    'client_id'  => env('PAYPAL_CLIENT_ID'),
    'secret'     => env('PAYPAL_SECRET'),
    'webhook_id' => env('PAYPAL_WEBHOOK_ID'),
    'sandbox'    => env('PAYPAL_SANDBOX', true),
],

'promptpay' => ['webhook_secret' => env('PROMPTPAY_WEBHOOK_SECRET')],
'duitnow'   => ['webhook_secret' => env('DUITNOW_WEBHOOK_SECRET')],
'qris'      => ['webhook_secret' => env('QRIS_WEBHOOK_SECRET')],
'paynow'    => ['webhook_secret' => env('PAYNOW_WEBHOOK_SECRET')],
```

Add the corresponding keys to your `.env`:
```env
STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_SANDBOX=true

PROMPTPAY_WEBHOOK_SECRET=...
DUITNOW_WEBHOOK_SECRET=...
QRIS_WEBHOOK_SECRET=...
PAYNOW_WEBHOOK_SECRET=...
```

## 6. Update CheckoutService to set status PENDING + store transaction ID
Now that webhooks exist, update `CheckoutService::buildClientKey()` in Step 13 to:
- Create a real Stripe PaymentIntent and return the `client_secret`
- Store the PaymentIntent ID as `payment.transaction_id`

For Stripe, replace the stub in `CheckoutService`:
```php
use Stripe\StripeClient;

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
```

Install the Stripe PHP SDK:
```bash
composer require stripe/stripe-php
```

## 7. Test webhooks locally with Stripe CLI
```bash
# Install Stripe CLI, then forward events to your local server
stripe listen --forward-to http://127.0.0.1:8000/api/webhooks/payment/stripe

# Trigger a test payment succeeded event
stripe trigger payment_intent.succeeded
```

For other providers, use their respective test webhook tools or trigger manually
with a POST request during development.

## 8. Endpoint available after this step
| Method | URI | Auth | Description |
|---|---|---|---|
| POST | `/api/webhooks/payment/{provider}` | none | Receive payment callback |

Providers: `stripe`, `paypal`, `promptpay`, `duitnow`, `qris`, `paynow`, `instapay`, `wechatpay`, `alipay`

## 9. What each handler does on success
| Event | Effect |
|---|---|
| Payment succeeded | `payments.status` → COMPLETED, `merch_orders.status` → PAID |
| Payment succeeded (subscription) | `fan_subscriptions.status` → ACTIVE |
| Payment failed | `payments.status` → FAILED, `merch_orders.status` → CANCELLED, `available_qty` restored |
| Payment failed (subscription) | `fan_subscriptions.status` → CANCELLED |

## 10. Always return HTTP 200
The controller returns 200 regardless of outcome. Returning 4xx/5xx causes
providers to retry the webhook repeatedly, which can flood your database.
Log failures instead and replay from the provider dashboard if needed.

## 11. WechatPay and Alipay signature notes
The current handlers use simplified signature checks for WeChat Pay and Alipay.
For production, replace with the official SDKs:
```bash
composer require wechatpay/wechatpay   # WeChat Pay
composer require alipaysdk/easysdk     # Alipay
```
