<?php

namespace App\Http\Requests\Fan;

use Illuminate\Foundation\Http\FormRequest;

class SubscribeRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'tier_id'        => ['required', 'uuid', 'exists:membership_tiers,id'],
            'payment_method' => ['required', 'string', 'in:CREDIT_CARD,PAYPAL,STRIPE,BANK_TRANSFER'],
            'auto_renew'     => ['sometimes', 'boolean'],
        ];
    }
}
