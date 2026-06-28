<?php

namespace App\Http\Requests\Manage;

use Illuminate\Foundation\Http\FormRequest;

class StoreBlogPostRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'title'       => ['required', 'string', 'max:500'],
            'content'     => ['required', 'string'],
            'category_id' => ['sometimes', 'nullable', 'uuid', 'exists:blog_categories,id'],
            'tags'        => ['sometimes', 'nullable', 'array'],
            'tags.*'      => ['string', 'max:50'],
            'visibility'  => ['sometimes', 'string', 'in:PUBLIC,SUBSCRIBERS_ONLY,PAID_ONLY'],
            'status'      => ['sometimes', 'string', 'in:DRAFT,PUBLISHED'],
            'publish_at'  => ['sometimes', 'nullable', 'date'],
        ];
    }
}
