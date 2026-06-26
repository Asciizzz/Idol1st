<?php

namespace App\Http\Requests\Asset;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                // 20 MB max — adjust as needed
                'max:20480',
                'mimetypes:' . implode(',', [
                    // Images
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                    'image/svg+xml',
                    // Audio
                    'audio/mpeg',
                    'audio/ogg',
                    'audio/wav',
                    'audio/webm',
                    'audio/aac',
                    // Fonts
                    'font/ttf',
                    'font/woff',
                    'font/woff2',
                    'application/font-woff',
                    'application/font-woff2',
                    'application/x-font-ttf',
                ]),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.mimetypes' => 'Unsupported file type. Allowed: images (jpg, png, gif, webp, svg), audio (mp3, ogg, wav, webm, aac), fonts (ttf, woff, woff2).',
        ];
    }
}
