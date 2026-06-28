<?php

namespace App\Http\Requests\Fan;

use Illuminate\Foundation\Http\FormRequest;

class StoreAddressRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'street'      => ['required', 'string', 'max:500'],
            'city'        => ['required', 'string', 'max:255'],
            'state'       => ['sometimes', 'nullable', 'string', 'max:255'],
            'country'     => ['required', 'string', 'max:100'],
            'postal_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'is_default'  => ['sometimes', 'boolean'],
        ];
    }
}
