<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Gate handled by ProjectPolicy in controller
    }

    public function rules(): array
    {
        return [
            'name'     => ['sometimes', 'string', 'max:255'],
            'status'   => ['sometimes', 'string', 'in:draft,published'],
            'settings' => ['sometimes', 'nullable', 'array'],
        ];
    }
}
