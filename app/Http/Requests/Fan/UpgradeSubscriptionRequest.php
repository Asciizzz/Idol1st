<?php

namespace App\Http\Requests\Fan;

use Illuminate\Foundation\Http\FormRequest;

class UpgradeSubscriptionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'tier_id' => ['required', 'uuid', 'exists:membership_tiers,id'],
        ];
    }
}
