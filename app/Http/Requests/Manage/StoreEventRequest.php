<?php

namespace App\Http\Requests\Manage;

use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'title'          => ['required', 'string', 'max:500'],
            'description'    => ['sometimes', 'nullable', 'string'],
            'event_type'     => ['required', 'string', 'in:CONCERT,FANSIGN,LIVESTREAM,ANNIVERSARY,COMEBACK'],
            'start_datetime' => ['required', 'date'],
            'end_datetime'   => ['sometimes', 'nullable', 'date', 'after:start_datetime'],
            'location'       => ['sometimes', 'nullable', 'string', 'max:500'],
            'ticket_url'     => ['sometimes', 'nullable', 'url'],
            'visibility'     => ['sometimes', 'string', 'in:PUBLIC,SUBSCRIBERS_ONLY,PAID_ONLY'],
        ];
    }
}
