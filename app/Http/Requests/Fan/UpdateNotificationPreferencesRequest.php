<?php

namespace App\Http\Requests\Fan;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationPreferencesRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            '*'            => ['array'],
            '*.type'       => ['required', 'string', 'in:NEW_POST,NEW_MERCH,EVENT_REMINDER,SUBSCRIPTION_EXPIRY,NEW_MEDIA,COMEBACK_ALERT'],
            '*.is_enabled' => ['required', 'boolean'],
            '*.channel'    => ['required', 'string', 'in:EMAIL,PUSH,IN_APP'],
        ];
    }
}
