<?php

namespace App\Http\Requests\Manage;

use Illuminate\Foundation\Http\FormRequest;

class StoreSocialLinkRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'platform' => ['required', 'string', 'in:TWITTER,INSTAGRAM,YOUTUBE,TIKTOK,WEIBO'],
            'url'      => ['required', 'url', 'max:2048'],
        ];
    }
}
