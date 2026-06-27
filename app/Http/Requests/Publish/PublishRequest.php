<?php

namespace App\Http\Requests\Publish;

use Illuminate\Foundation\Http\FormRequest;

class PublishRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // ownership enforced via ProjectPolicy in controller
    }

    public function rules(): array
    {
        return [
            // Optionally pin to a specific snapshot version.
            // If omitted, the latest snapshot is used.
            'version' => ['sometimes', 'integer', 'min:1'],

            // Optional custom domain — e.g. "myidol.com"
            'domain'  => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
