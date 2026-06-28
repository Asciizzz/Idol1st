<?php

namespace App\Http\Requests\Manage;

use Illuminate\Foundation\Http\FormRequest;

class StoreMerchProductRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'               => ['required', 'string', 'max:255'],
            'description'        => ['sometimes', 'nullable', 'string'],
            'base_price'         => ['required', 'numeric', 'min:0'],
            'currency'           => ['required', 'string', 'size:3'],
            'category_id'        => ['sometimes', 'nullable', 'uuid', 'exists:merch_categories,id'],
            'is_limited_edition' => ['sometimes', 'boolean'],
            'available_from'     => ['sometimes', 'nullable', 'date'],
            'available_until'    => ['sometimes', 'nullable', 'date', 'after:available_from'],
            'variants'           => ['required', 'array', 'min:1'],
            'variants.*.sku'       => ['required', 'string', 'unique:merch_variants,sku'],
            'variants.*.price'     => ['required', 'numeric', 'min:0'],
            'variants.*.stock_qty' => ['required', 'integer', 'min:0'],
            'variants.*.attributes'=> ['required', 'array'],
        ];
    }
}
