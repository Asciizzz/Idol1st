<?php

namespace App\Http\Requests\Manage;

use Illuminate\Foundation\Http\FormRequest;

class StoreMembershipTierRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'           => ['required', 'string', 'max:255'],
            'price'          => ['required', 'numeric', 'min:0'],
            'billing_cycle'  => ['required', 'string', 'in:MONTHLY,YEARLY,LIFETIME'],
            'max_members'    => ['sometimes', 'nullable', 'integer', 'min:1'],
            'is_active'      => ['sometimes', 'boolean'],
            'perks'          => ['sometimes', 'array'],
            'perks.*.description' => ['required_with:perks', 'string', 'max:500'],
            'perks.*.perk_type'   => ['required_with:perks', 'string',
                'in:EXCLUSIVE_CONTENT,EARLY_ACCESS,MERCH_DISCOUNT,LIVE_ACCESS,BADGE'],
        ];
    }
}
