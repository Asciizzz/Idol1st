<?php

return [
    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel'              => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

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

];
