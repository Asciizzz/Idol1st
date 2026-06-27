<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StorePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'          => ['required', 'string', 'max:255'],
            'price'         => ['required', 'numeric', 'min:0'],
            'billing_cycle' => ['required', 'string', 'in:MONTHLY,YEARLY,LIFETIME'],
            'is_active'     => ['sometimes', 'boolean'],
        ];
    }
}
