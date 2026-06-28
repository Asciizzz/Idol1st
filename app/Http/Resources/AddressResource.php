<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AddressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'street'      => $this->street,
            'city'        => $this->city,
            'state'       => $this->state,
            'country'     => $this->country,
            'postal_code' => $this->postal_code,
            'is_default'  => $this->is_default,
        ];
    }
}
