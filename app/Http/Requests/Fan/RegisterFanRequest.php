<?php

namespace App\Http\Requests\Fan;

use Illuminate\Foundation\Http\FormRequest;

class RegisterFanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'email'                 => ['required', 'email', 'max:255'],
            'username'              => ['required', 'string', 'max:50', 'alpha_dash'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
            'display_name'          => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }
}
