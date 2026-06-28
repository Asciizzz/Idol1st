<?php

namespace App\Http\Requests\Manage;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVariantStockRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'stock_qty' => ['required', 'integer', 'min:0'],
        ];
    }
}
