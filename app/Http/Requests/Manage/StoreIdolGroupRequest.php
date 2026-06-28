<?php

namespace App\Http\Requests\Manage;

use Illuminate\Foundation\Http\FormRequest;

class StoreIdolGroupRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'group_name' => ['required', 'string', 'max:255'],
            'debut_date' => ['sometimes', 'nullable', 'date'],
            'agency'     => ['sometimes', 'nullable', 'string', 'max:255'],
            'bio'        => ['sometimes', 'nullable', 'string'],
            'member_ids' => ['sometimes', 'array'],
            'member_ids.*' => ['uuid', 'exists:idol_profiles,id'],
        ];
    }
}
