<?php

namespace App\Http\Requests\Fan;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFanProfileRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'display_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'avatar'       => ['sometimes', 'nullable', 'file', 'image', 'max:5120'], // 5MB
        ];
    }
}
