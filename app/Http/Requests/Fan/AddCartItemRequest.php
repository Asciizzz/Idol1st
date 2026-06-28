<?php

namespace App\Http\Requests\Fan;

use Illuminate\Foundation\Http\FormRequest;

class AddCartItemRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'uuid', 'exists:merch_products,id'],
            'variant_id' => ['required', 'uuid', 'exists:merch_variants,id'],
            'quantity'   => ['required', 'integer', 'min:1'],
        ];
    }
}
