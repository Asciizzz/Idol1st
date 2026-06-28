<?php

namespace App\Http\Requests\Fan;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'address_id'       => ['required', 'uuid', 'exists:addresses,id'],
            'payment_method'   => ['required', 'string', 'in:CREDIT_CARD,PAYPAL,STRIPE,BANK_TRANSFER'],
            'transfer_network' => [
                'required_if:payment_method,BANK_TRANSFER',
                'nullable',
                'string',
                'in:PROMPTPAY,DUITNOW,QRIS,PAYNOW,INSTAPAY,WECHATPAY,ALIPAY',
            ],
        ];
    }
}
