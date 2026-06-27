<?php

namespace App\Http\Requests\Manage;

use Illuminate\Foundation\Http\FormRequest;

class UpdateIdolProfileRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'stage_name'    => ['sometimes', 'string', 'max:255'],
            'bio'           => ['sometimes', 'nullable', 'string'],
            'debut_date'    => ['sometimes', 'nullable', 'date'],
            'agency'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'nationality'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'status'        => ['sometimes', 'string', 'in:ACTIVE,HIATUS,RETIRED'],
            'profile_image' => ['sometimes', 'nullable', 'file', 'image', 'max:5120'],  // 5MB
            'banner_image'  => ['sometimes', 'nullable', 'file', 'image', 'max:10240'], // 10MB
        ];
    }
}
