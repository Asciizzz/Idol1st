<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MerchCartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'       => $this->id,
            'items'    => MerchCartItemResource::collection($this->whenLoaded('items')),
            'subtotal' => $this->subtotal,
            'total'    => $this->total,
            'currency' => $this->items->first()?->product?->currency ?? 'USD',
        ];
    }
}
