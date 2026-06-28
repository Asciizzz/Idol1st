<?php

namespace App\Http\Requests\Manage;

use Illuminate\Foundation\Http\FormRequest;

class ShipOrderRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'tracking_number'    => ['required', 'string', 'max:255'],
            'carrier'            => ['required', 'string', 'max:100'],
            'estimated_delivery' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
